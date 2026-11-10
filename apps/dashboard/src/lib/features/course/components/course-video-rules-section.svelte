<script lang="ts">
  import VideoIcon from '@lucide/svelte/icons/video';
  import ListChecksIcon from '@lucide/svelte/icons/list-checks';
  import { Button } from '@cio/ui/base/button';
  import { Checkbox } from '@cio/ui/base/checkbox';
  import { Label } from '@cio/ui/base/label';
  import { Switch } from '@cio/ui/base/switch';
  import { Spinner } from '@cio/ui/base/spinner';
  import * as Field from '@cio/ui/base/field';
  import * as Select from '@cio/ui/base/select';
  import { NumberField } from '@cio/ui/custom/number-field';
  import { DEFAULT_VIDEO_WATCH_THRESHOLD } from '@cio/utils/validation/course/video-rules';
  import { t } from '$lib/utils/functions/translations';
  import { courseApi, courseVideoRulesApi } from '$features/course/api';
  import type { CourseLessonVideoRule, CourseVideoRules } from '$features/course/utils/types';

  interface Props {
    onChange?: () => void;
  }

  let { onChange }: Props = $props();

  type LessonGroup = { key: string; title: string | null; lessons: CourseLessonVideoRule[] };

  let threshold = $state<number>(DEFAULT_VIDEO_WATCH_THRESHOLD);
  let lessons = $state<CourseLessonVideoRule[]>([]);
  let baseline = $state('');
  let showErrors = $state(false);
  let draftCourseId = '';

  const isLoading = $derived(courseVideoRulesApi.isLoading && lessons.length === 0);

  const lessonGroups = $derived.by(() => {
    const groups: LessonGroup[] = [];
    for (const lesson of lessons) {
      const key = lesson.sectionId ?? 'ungrouped';
      const lastGroup = groups.at(-1);
      if (lastGroup?.key === key) {
        lastGroup.lessons.push(lesson);
        continue;
      }

      groups.push({ key, title: lesson.sectionTitle, lessons: [lesson] });
    }

    return groups;
  });

  const requiredCount = $derived(lessons.filter((lesson) => lesson.completionPolicy !== 'none').length);
  const videoWatchCount = $derived(lessons.filter((lesson) => lesson.completionPolicy === 'video_watch').length);
  const lessonsWithUploads = $derived(lessons.filter(hasEnforceableVideos));

  $effect(() => {
    const courseId = courseApi.course?.id;
    if (!courseId || courseId === draftCourseId) return;

    draftCourseId = courseId;
    void loadRules(courseId);
  });

  async function loadRules(courseId: string) {
    await courseVideoRulesApi.load(courseId);
    if (courseId !== draftCourseId) return;

    resetDraft(courseVideoRulesApi.rules);
  }

  function hasEnforceableVideos(lesson: CourseLessonVideoRule): boolean {
    return lesson.videos.some((video) => video.enforceable && video.assetId);
  }

  function enforcedAssetIds(lesson: CourseLessonVideoRule): string[] {
    return lesson.videos
      .filter((video) => video.enforceable && video.assetId && video.watchEnforced)
      .map((video) => video.assetId as string);
  }

  function enforceAllVideos(lesson: CourseLessonVideoRule) {
    for (const video of lesson.videos) {
      if (video.enforceable && video.assetId) video.watchEnforced = true;
    }
  }

  /** A video-watch lesson with no flagged video enforces all its uploads, so show them all as checked. */
  function normalizeLesson(lesson: CourseLessonVideoRule): CourseLessonVideoRule {
    const copy: CourseLessonVideoRule = JSON.parse(JSON.stringify(lesson));
    if (copy.completionPolicy === 'video_watch' && enforcedAssetIds(copy).length === 0) {
      enforceAllVideos(copy);
    }

    return copy;
  }

  function serializeDraft(): string {
    const rules = lessons.map((lesson) => ({
      lessonId: lesson.lessonId,
      completionPolicy: lesson.completionPolicy,
      enforcedAssetIds: lesson.completionPolicy === 'video_watch' ? enforcedAssetIds(lesson) : []
    }));

    return JSON.stringify({ videoWatchThreshold: threshold, lessons: rules });
  }

  function resetDraft(rules: CourseVideoRules | null) {
    if (!rules) return;

    threshold = rules.videoWatchThreshold;
    lessons = rules.lessons.map(normalizeLesson);
    baseline = serializeDraft();
    showErrors = false;
  }

  function markChanged() {
    onChange?.();
  }

  function lessonHasError(lesson: CourseLessonVideoRule): boolean {
    return lesson.completionPolicy === 'video_watch' && enforcedAssetIds(lesson).length === 0;
  }

  function setRequired(lesson: CourseLessonVideoRule, isRequired: boolean) {
    lesson.completionPolicy = isRequired ? 'manual' : 'none';
    markChanged();
  }

  function setCompletionMode(lesson: CourseLessonVideoRule, value: string) {
    if (value !== 'manual' && value !== 'video_watch') return;

    lesson.completionPolicy = value;
    if (value === 'video_watch' && enforcedAssetIds(lesson).length === 0) {
      enforceAllVideos(lesson);
    }
    markChanged();
  }

  function setVideoEnforced(video: CourseLessonVideoRule['videos'][number], checked: boolean) {
    video.watchEnforced = checked;
    markChanged();
  }

  function requireAllLessons() {
    for (const lesson of lessons) {
      if (lesson.completionPolicy === 'none') lesson.completionPolicy = 'manual';
    }
    markChanged();
  }

  function requireVideoWatchEverywhere() {
    for (const lesson of lessonsWithUploads) {
      lesson.completionPolicy = 'video_watch';
      enforceAllVideos(lesson);
    }
    markChanged();
  }

  function handleThresholdChange(next: number | null) {
    threshold = next ?? DEFAULT_VIDEO_WATCH_THRESHOLD;
    markChanged();
  }

  function completionModeLabel(lesson: CourseLessonVideoRule): string {
    return lesson.completionPolicy === 'video_watch'
      ? t.get('course.navItem.settings.video_rules.mode_video_watch')
      : t.get('course.navItem.settings.video_rules.mode_manual');
  }

  export function hasChanges(): boolean {
    return baseline !== '' && serializeDraft() !== baseline;
  }

  /** Saves the draft when it changed. Returns false when validation or the request fails. */
  export async function save(): Promise<boolean> {
    if (!hasChanges()) return true;

    if (lessons.some(lessonHasError)) {
      showErrors = true;
      document.getElementById('video-rules')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }

    const courseId = courseApi.course?.id;
    if (!courseId) return false;

    const payload = JSON.parse(serializeDraft());
    const saved = await courseVideoRulesApi.save(courseId, payload);
    if (!saved) return false;

    resetDraft(courseVideoRulesApi.rules);
    if (courseApi.course?.metadata) {
      courseApi.course.metadata.videoWatchThreshold = threshold;
    }

    return true;
  }

  export function discard() {
    resetDraft(courseVideoRulesApi.rules);
  }
</script>

<Field.Field>
  <Field.Label>
    <a href="#video-rules" class="hover:underline">{$t('course.navItem.settings.video_rules.title')}</a>
  </Field.Label>
  <Field.Description>{$t('course.navItem.settings.video_rules.description')}</Field.Description>

  {#if isLoading}
    <div class="flex justify-center py-6"><Spinner /></div>
  {:else if lessons.length === 0}
    <p class="ui:text-muted-foreground text-sm">{$t('course.navItem.settings.video_rules.empty')}</p>
  {:else}
    <div class="flex flex-col gap-4">
      <div class="max-w-xs">
        <NumberField
          integer
          min={1}
          max={100}
          label={$t('course.navItem.settings.video_rules.threshold_label')}
          value={threshold}
          onValueChange={handleThresholdChange}
        />
        <p class="ui:text-muted-foreground mt-1 text-xs">
          {$t('course.navItem.settings.video_rules.threshold_helper')}
        </p>
      </div>

      <div class="ui:bg-muted/50 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg px-3 py-2 text-sm">
        <span class="flex items-center gap-1.5">
          <ListChecksIcon size={16} class="ui:text-primary" />
          {$t('course.navItem.settings.video_rules.summary_required', {
            required: requiredCount,
            total: lessons.length
          })}
        </span>
        <span class="flex items-center gap-1.5">
          <VideoIcon size={16} class="ui:text-primary" />
          {$t('course.navItem.settings.video_rules.summary_video_watch', { count: videoWatchCount })}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onclick={requireAllLessons} disabled={requiredCount === lessons.length}>
          {$t('course.navItem.settings.video_rules.require_all')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={requireVideoWatchEverywhere}
          disabled={lessonsWithUploads.length === 0}
        >
          {$t('course.navItem.settings.video_rules.video_watch_all')}
        </Button>
      </div>

      {#each lessonGroups as group (group.key)}
        <div class="flex flex-col gap-2">
          <p class="ui:text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {group.title || $t('course.navItem.settings.video_rules.ungrouped')}
          </p>

          {#each group.lessons as lesson (lesson.lessonId)}
            {@const isRequired = lesson.completionPolicy !== 'none'}
            {@const canWatchVideos = hasEnforceableVideos(lesson)}
            <div
              class="rounded-lg border px-3 py-2.5 {showErrors && lessonHasError(lesson)
                ? 'ui:border-destructive'
                : ''}"
              data-testid="video-rule-lesson"
            >
              <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p class="min-w-0 flex-1 text-sm font-medium break-words">{lesson.title}</p>
                <div class="flex shrink-0 items-center gap-2">
                  <Label for="required-{lesson.lessonId}" class="text-xs font-normal">
                    {$t('course.navItem.settings.video_rules.required')}
                  </Label>
                  <Switch
                    id="required-{lesson.lessonId}"
                    checked={isRequired}
                    onCheckedChange={(checked) => setRequired(lesson, checked)}
                  />
                </div>
              </div>

              {#if isRequired}
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <span class="ui:text-muted-foreground text-xs">
                    {$t('course.navItem.settings.video_rules.complete_when')}
                  </span>
                  <Select.Root
                    type="single"
                    value={lesson.completionPolicy}
                    onValueChange={(value) => setCompletionMode(lesson, value)}
                  >
                    <Select.Trigger size="sm" class="w-auto min-w-48">{completionModeLabel(lesson)}</Select.Trigger>
                    <Select.Content>
                      <Select.Item value="manual">{$t('course.navItem.settings.video_rules.mode_manual')}</Select.Item>
                      <Select.Item value="video_watch" disabled={!canWatchVideos}>
                        {$t('course.navItem.settings.video_rules.mode_video_watch')}
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                  {#if !canWatchVideos}
                    <span class="ui:text-muted-foreground text-xs">
                      {$t('course.navItem.settings.video_rules.no_uploads')}
                    </span>
                  {/if}
                </div>

                {#if lesson.completionPolicy === 'video_watch'}
                  <ul class="mt-2 flex flex-col gap-1.5 border-l-2 pl-3">
                    {#each lesson.videos as video, index (video.assetId ?? `${video.type}-${index}`)}
                      {#if video.enforceable && video.assetId}
                        <li class="flex items-center gap-2 text-sm">
                          <Checkbox
                            id="enforce-{lesson.lessonId}-{index}"
                            checked={video.watchEnforced}
                            onCheckedChange={(checked) => setVideoEnforced(video, checked === true)}
                          />
                          <Label for="enforce-{lesson.lessonId}-{index}" class="min-w-0 font-normal break-words">
                            {video.title}
                          </Label>
                          <span class="ui:text-muted-foreground shrink-0 text-xs">
                            {$t('course.navItem.settings.video_rules.no_skip')}
                          </span>
                        </li>
                      {:else}
                        <li class="ui:text-muted-foreground text-xs">
                          {video.title} — {$t('course.navItem.settings.video_rules.not_trackable')}
                        </li>
                      {/if}
                    {/each}
                  </ul>
                  {#if showErrors && lessonHasError(lesson)}
                    <p class="ui:text-destructive mt-1 text-xs">
                      {$t('course.navItem.settings.video_rules.pick_video_error')}
                    </p>
                  {/if}
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</Field.Field>
