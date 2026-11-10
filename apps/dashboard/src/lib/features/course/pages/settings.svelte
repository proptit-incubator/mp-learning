<script lang="ts">
  import { untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { Badge } from '@cio/ui/base/badge';
  import { Label } from '@cio/ui/base/label';
  import { Switch } from '@cio/ui/base/switch';
  import * as RadioGroup from '@cio/ui/base/radio-group';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import XIcon from '@lucide/svelte/icons/x';

  import ReorderMaterialTabs from '$features/course/components/reorder-material-tabs.svelte';
  import { CourseTagPicker } from '$features/course/components';
  import TemplateSettingsSection from '$features/course/components/template-settings-section.svelte';
  import CourseVideoRulesSection from '$features/course/components/course-video-rules-section.svelte';
  import ReminderPicker from '$features/course/components/live-session-reminders/reminder-picker.svelte';
  import DeliveryLogSheet from '$features/course/components/live-session-reminders/delivery-log-sheet.svelte';
  import {
    createReminderRow,
    getReminderRowErrors,
    reminderRowsToOffsets
  } from '$features/course/utils/live-session-reminder-utils';
  import { resolveLiveSessionReminderOffsets } from '@cio/utils/constants/live-session-reminder';
  import { BackButton } from '@cio/ui/custom/back-button';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { Input } from '@cio/ui/base/input';
  import * as Field from '@cio/ui/base/field';
  import {
    UpgradeBanner,
    UnsavedChanges,
    UploadWidget,
    TextEditor,
    AttentionHighlight,
    SettingsCard,
    SettingsSeparator
  } from '$features/ui';
  import { Button } from '@cio/ui/base/button';

  import { createCourseSettings } from '$features/course/utils/settings-store';
  import Copy from '@lucide/svelte/icons/copy';
  import * as Alert from '@cio/ui/base/alert';
  import LockOpenIcon from '@lucide/svelte/icons/lock-open';
  import type { Course } from '../utils/types';
  import { t } from '$lib/utils/functions/translations';
  import { isObject } from '$lib/utils/functions/isObject';
  import { snackbar } from '$features/ui/snackbar/store';
  import { generateSlug, isSelfEnrollmentAllowed } from '@cio/utils/functions';
  import { courseHasLiveSession } from '../utils/live-session';
  import { DeleteModal } from '$features/ui';
  import { contentApi, courseApi } from '$features/course/api';
  import { collectLockedContentItems } from '$features/course/utils/content-lock-utils';
  import { tagApi } from '$features/tag/api';
  import { uploadImage } from '$lib/utils/services/upload';
  import { copyToClipboard } from '$lib/utils/functions/formatYoutubeVideo';
  import { handleOpenWidget } from '$features/ui/course-landing-page/store';
  import { currentOrgPath, isFreePlan } from '$lib/utils/store/org';
  import { page } from '$app/stores';
  import { NAVIGATION_SOURCE, NAVIGATION_SOURCE_PARAM, ROUTE_NAME, ROUTE_SECTIONS } from '$lib/routing/routes';
  import { buildRoutePath } from '$lib/routing/route-path';

  interface Props {
    hasUnsavedChanges?: boolean;
  }

  let { hasUnsavedChanges = $bindable(false) }: Props = $props();

  let videoRulesSection: CourseVideoRulesSection | null = $state(null);
  const settings = createCourseSettings();

  let isLoading = $state(false);
  let isDeleting = $state(false);
  let errors: {
    title: string | undefined;
    description: string | undefined;
  } = $state({
    title: undefined,
    description: undefined
  });
  let avatar: string | undefined;
  let openDeleteModal = $state(false);
  let selectedTagIds = $state<string[]>([]);
  let initialTagIds = $state<string[]>([]);
  let loadedCourseTagsForId = $state<string | null>(null);
  let initializedCourseId = $state<string | null>(null);
  let isTagPopoverOpen = $state(false);

  function normalizeTagIds(tagIds: string[]) {
    return Array.from(new Set(tagIds));
  }

  function areSameTagIds(a: string[], b: string[]) {
    if (a.length !== b.length) {
      return false;
    }

    const left = [...a].sort();
    const right = [...b].sort();

    return left.every((value, index) => value === right[index]);
  }

  async function loadCourseTags(courseId: string) {
    loadedCourseTagsForId = courseId;

    await Promise.all([tagApi.getTagGroups(), tagApi.getCourseTags(courseId)]);

    const assignedTagIds = normalizeTagIds(tagApi.courseTags.map((tag) => tag.id));
    selectedTagIds = assignedTagIds;
    initialTagIds = assignedTagIds;
  }

  function toggleTagSelection(tagId: string) {
    const selected = new Set(selectedTagIds);

    if (selected.has(tagId)) {
      selected.delete(tagId);
    } else {
      selected.add(tagId);
    }

    selectedTagIds = Array.from(selected);
    hasUnsavedChanges = true;
  }

  function removeSelectedTag(tagId: string) {
    selectedTagIds = selectedTagIds.filter((id) => id !== tagId);
    hasUnsavedChanges = true;
  }

  function widgetControl() {
    $handleOpenWidget.open = !$handleOpenWidget.open;
  }

  const downloadCourse = async () => {
    alert($t('course.navItem.settings.coming_soon'));
  };

  const deleteBannerImage = () => {
    $settings.bannerImage = '';
    hasUnsavedChanges = true;
  };

  let isUnlockingAll = $state(false);

  const lockedContentItems = $derived(collectLockedContentItems(courseApi.course));
  const hasLiveSession = $derived(courseHasLiveSession(courseApi.course));
  const showLockedContentNotice = $derived($settings.isPublished && lockedContentItems.length > 0);

  async function handleUnlockAllContent() {
    const courseId = courseApi.course?.id;
    if (!courseId || lockedContentItems.length === 0 || isUnlockingAll) return;

    isUnlockingAll = true;
    const itemsToUnlock = [...lockedContentItems];
    const didUnlock = await contentApi.updateContent(
      courseId,
      itemsToUnlock.map((item) => ({ id: item.id, type: item.type, isUnlocked: true }))
    );

    if (didUnlock) {
      for (const item of itemsToUnlock) {
        courseApi.updateContentItem(item.id, item.type, { isUnlocked: true });
      }
      snackbar.success('snackbar.course_settings.success.unlocked_all_content');
    }

    isUnlockingAll = false;
  }

  async function handleDeleteCourse() {
    if (!courseApi.course) return;

    isDeleting = true;

    await courseApi.delete(courseApi.course.id);
    if (courseApi.success) {
      goto($currentOrgPath + '/courses');
    }

    isDeleting = false;
  }

  function onPublishToggle(checked: boolean) {
    $settings.isPublished = checked;
    hasUnsavedChanges = true;
  }

  export async function handleSave() {
    if (!$settings.courseTitle) {
      errors.title = $t('snackbar.course_settings.error.title');
      return;
    }

    if (!$settings.courseDescription) {
      errors.description = $t('snackbar.course_settings.error.description');
      return;
    }

    if (hasLiveSession && Object.keys(getReminderRowErrors($settings.liveSessionReminders)).length > 0) {
      snackbar.error('course.navItem.settings.live_session_reminders.validation.fix_errors');
      return;
    }

    try {
      let bannerImageUrl = $settings.bannerImage;

      // Upload image if avatar is provided
      if (avatar) {
        bannerImageUrl = await uploadImage(new File([avatar], avatar));
      }

      if (!courseApi.course) return;

      if ($settings.isPublished && !courseApi.course.slug) {
        courseApi.course.slug = generateSlug($settings.courseTitle, { appendTimestamp: true });
      }

      const reminderOffsetsPayload = getReminderOffsetsPayload(courseApi.course);
      const metadataPayload = {
        ...(isObject(courseApi.course.metadata) ? courseApi.course.metadata : {}),
        ...reminderOffsetsPayload,
        lessonTabsOrder: $settings.tabs,
        grading: $settings.grading,
        lessonDownload: $settings.lessonDownload,
        allowSelfEnrollment: $settings.allowSelfEnrollment,
        allowMarkdownExport: $settings.allowMarkdownExport,
        isContentGroupingEnabled: $settings.isContentGroupingEnabled,
        progressionMode: $settings.progressionMode,
        commentsEnabled: $settings.commentsEnabled,
        welcomeEmailMessage: $settings.welcomeEmailMessage?.trim() ? $settings.welcomeEmailMessage : null
      } as NonNullable<Course['metadata']>;

      const updatedCourse = {
        title: $settings.courseTitle,
        description: $settings.courseDescription,
        bannerImage: bannerImageUrl,
        isPublished: $settings.isPublished,
        metadata: metadataPayload,
        slug: courseApi.course.slug ?? undefined,
        recertificationMonths: $settings.recertificationMonths
      };

      const normalizedSelectedTagIds = normalizeTagIds(selectedTagIds);
      const hasTagChanges = !areSameTagIds(normalizedSelectedTagIds, initialTagIds);

      const updatePayload = {
        ...updatedCourse,
        ...(hasTagChanges ? { tagIds: normalizedSelectedTagIds } : {})
      };

      const draftAtSave = JSON.stringify({
        settings: $settings,
        tagIds: [...selectedTagIds].sort(),
        avatar
      });

      const response = await courseApi.update(courseApi.course.id, updatePayload, {
        showSuccessToast: !hasTagChanges
      });

      const videoRulesSaved = courseApi.success && response ? await (videoRulesSection?.save() ?? true) : false;

      if (courseApi.success && response && videoRulesSaved) {
        const draftUnchanged =
          JSON.stringify({ settings: $settings, tagIds: [...selectedTagIds].sort(), avatar }) === draftAtSave;

        if (hasTagChanges) {
          // The server stored the submitted tags; keep the user's newer toggles selected.
          initialTagIds = normalizedSelectedTagIds;
          if (draftUnchanged) {
            selectedTagIds = normalizedSelectedTagIds;
          }
        }

        if (draftUnchanged) {
          hasUnsavedChanges = false;
        }
      }
    } catch (error) {
      console.error(error);
      snackbar.error();
    }
  }

  async function setDefault(course: Course) {
    if (!course || !Object.keys(course).length) return;

    const allowSelfEnrollment = isSelfEnrollmentAllowed(course.metadata);
    const reminderOffsets = resolveLiveSessionReminderOffsets(course.metadata?.liveSessionReminderOffsetsMinutes);
    const liveSessionReminders = reminderOffsets.map(createReminderRow);

    untrack(() => {
      settings.update((current) => {
        Object.assign(current, {
          courseTitle: course.title,
          courseDescription: course.description,
          bannerImage: course.bannerImage || '',
          tabs: course.metadata?.lessonTabsOrder || $settings.tabs,
          grading: !!course.metadata?.grading,
          lessonDownload: !!course.metadata?.lessonDownload,
          allowMarkdownExport: !!course.metadata?.allowMarkdownExport,
          isPublished: !!course.isPublished,
          allowSelfEnrollment,
          isContentGroupingEnabled: course.metadata?.isContentGroupingEnabled ?? true,
          progressionMode: course.metadata?.progressionMode ?? 'free',
          commentsEnabled: course.metadata?.commentsEnabled ?? true,
          welcomeEmailMessage: course.metadata?.welcomeEmailMessage ?? '',
          liveSessionReminders,
          recertificationMonths: course.recertificationMonths ?? null
        });
        return current;
      });
    });
  }

  function getReminderOffsetsPayload(course: Course) {
    if (!hasLiveSession) return {};

    const nextOffsets = reminderRowsToOffsets($settings.liveSessionReminders);
    const currentOffsets = resolveLiveSessionReminderOffsets(course.metadata?.liveSessionReminderOffsetsMinutes);
    const isUnchanged =
      nextOffsets.length === currentOffsets.length &&
      nextOffsets.every((offsetMinutes) => currentOffsets.includes(offsetMinutes));
    if (isUnchanged) return {};

    return { liveSessionReminderOffsetsMinutes: nextOffsets };
  }

  export function handleDiscard() {
    if (!courseApi.course) return;

    setDefault(courseApi.course);
    videoRulesSection?.discard();
    selectedTagIds = [...initialTagIds];
    avatar = undefined;
    errors = { title: undefined, description: undefined };
    hasUnsavedChanges = false;
  }

  // Initialize course from page data
  $effect(() => {
    const courseData = $page.data?.course;
    const courseId = $page.data?.courseId;
    if (courseData && courseId && !courseApi.course) {
      courseApi.course = courseData;
    }
  });

  $effect(() => {
    const course = courseApi.course;
    if (course?.id && initializedCourseId !== course.id) {
      initializedCourseId = course.id;
      setDefault(course);
    }
  });

  $effect(() => {
    const courseId = courseApi.course?.id;

    if (!courseId || loadedCourseTagsForId === courseId) {
      return;
    }

    loadCourseTags(courseId);
  });

  const selectedTagChips = $derived.by(() => {
    const allTags = tagApi.tagGroups.flatMap((group) =>
      group.tags.map((tag) => ({
        ...tag,
        category: group.name
      }))
    );

    const tagById = new Map(allTags.map((tag) => [tag.id, tag]));

    const selected: (typeof allTags)[number][] = [];

    for (const tagId of selectedTagIds) {
      const existing = tagById.get(tagId);
      if (existing) {
        selected.push(existing);
        continue;
      }

      const assigned = tagApi.courseTags.find((tag) => tag.id === tagId);
      if (assigned) {
        selected.push({
          ...assigned,
          category: '',
          courseCount: 1
        });
      }
    }

    return selected;
  });

  const hasAnyTagsCreated = $derived(tagApi.tagGroups.some((group) => group.tags.length > 0));

  const courseLink = $derived(
    courseApi.course?.id ? new URL(`/courses/${courseApi.course.id}/lessons`, $page.url.origin).toString() : '#'
  );

  // Completion rules change the certificate settings, which the API only accepts on plans with certificates.
  const areCompletionRulesLocked = $derived($isFreePlan);

  const cameFromCertificateSettings = $derived(
    $page.url.searchParams.get(NAVIGATION_SOURCE_PARAM) === NAVIGATION_SOURCE.CERTIFICATE_SETTINGS
  );

  const certificateSettingsHref = $derived(
    courseApi.course?.id
      ? resolve(buildRoutePath(ROUTE_NAME.COURSE_CERTIFICATE, { id: courseApi.course.id, tab: 'settings' }), {})
      : undefined
  );

  function onRecertificationToggle(checked: boolean) {
    $settings.recertificationMonths = checked ? ($settings.recertificationMonths ?? 12) : null;
    hasUnsavedChanges = true;
  }

  function onRecertificationMonthsChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    $settings.recertificationMonths = Number.isInteger(value) && value >= 1 && value <= 120 ? value : 12;
    hasUnsavedChanges = true;
  }
</script>

<UnsavedChanges bind:hasUnsavedChanges />

<DeleteModal onDelete={handleDeleteCourse} bind:open={openDeleteModal} />

<div class="flex w-full flex-col gap-8">
  <SettingsCard id="general" title={$t('course.navItem.settings.general_card_title')}>
    <Field.Group>
      <Field.Field id="cover-image" class="scroll-mt-24">
        <div class="flex flex-col items-start gap-4 sm:flex-row">
          <img
            alt={$t('course.navItem.settings.cover_image')}
            src={$settings.bannerImage ? $settings.bannerImage : '/images/mp-course-cover.svg'}
            class="h-[120px] w-[168px] rounded-md border object-cover"
          />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Field.Label>
              <a href="#cover-image" class="hover:underline">{$t('course.navItem.settings.cover_image')}</a>
            </Field.Label>
            <Field.Description>{$t('course.navItem.settings.optional_image')}</Field.Description>
            <div class="flex items-center gap-2">
              <Button variant="secondary" onclick={widgetControl}>
                {$t('course.navItem.settings.replace')}
              </Button>
              <Button variant="outline" onclick={deleteBannerImage}>
                {$t('course.navItem.settings.remove')}
              </Button>
            </div>
          </div>
        </div>
        {#if $handleOpenWidget.open}
          <UploadWidget
            bind:imageURL={$settings.bannerImage}
            onchange={() => {
              hasUnsavedChanges = true;
            }}
          />
        {/if}
      </Field.Field>

      <div id="course-title" class="scroll-mt-24">
        <InputField
          label={$t('course.navItem.settings.course_title')}
          placeholder={$t('course.navItem.settings.course_title_placeholder')}
          className="w-full"
          isRequired
          bind:value={$settings.courseTitle}
          errorMessage={errors?.title || courseApi.errors?.title}
          onInput={() => {
            errors.title = undefined;
            delete courseApi.errors.title;
            hasUnsavedChanges = true;
          }}
        />
      </div>

      <div id="course-description" class="scroll-mt-24">
        <TextareaField
          label={$t('course.navItem.settings.course_description')}
          placeholder={$t('course.navItem.settings.placeholder')}
          className="w-full"
          isRequired
          bind:value={$settings.courseDescription}
          errorMessage={errors?.description || courseApi.errors?.description}
          oninput={() => {
            errors.description = undefined;
            delete courseApi.errors.description;
            hasUnsavedChanges = true;
          }}
          onchange={() => {
            errors.description = undefined;
            delete courseApi.errors.description;
            hasUnsavedChanges = true;
          }}
        />
      </div>

      <Field.Field id="share" class="scroll-mt-24">
        <Field.Label><a href="#share" class="hover:underline">{$t('course.navItem.settings.link')}</a></Field.Label>
        <div class="flex items-center justify-between gap-2 rounded-lg border p-2">
          <p class="min-w-0 truncate text-sm">{courseLink}</p>
          <div class="flex shrink-0 gap-1">
            <IconButton
              href={courseLink}
              target="_blank"
              rel="noopener noreferrer"
              tooltip={$t('course.navItem.settings.open_link')}><ArrowUpRightIcon size={16} /></IconButton
            >
            <IconButton onclick={() => copyToClipboard(courseLink)} tooltip={$t('course.navItem.settings.copy_link')}
              ><Copy size={16} /></IconButton
            >
          </div>
        </div>
        <Field.Description>{$t('mp_learning.internal')}</Field.Description>
      </Field.Field>

      <Field.Field id="tags" class="scroll-mt-24">
        <Field.Label>
          <a href="#tags" class="hover:underline">{$t('course.navItem.settings.tags.title')}</a>
        </Field.Label>
        <Field.Description>{$t('course.navItem.settings.tags.description')}</Field.Description>
        <div class="space-y-3">
          <div class="flex flex-wrap items-center gap-2">
            {#if !selectedTagChips.length && !hasAnyTagsCreated}
              <p class="ui:text-muted-foreground text-sm">{$t('course.navItem.settings.tags.none_created')}</p>
            {:else if !selectedTagChips.length}
              <p class="ui:text-muted-foreground text-sm">{$t('course.navItem.settings.tags.empty')}</p>
            {:else}
              {#each selectedTagChips as tag (tag.id)}
                <Badge variant="outline" class="flex items-center gap-2">
                  <span
                    class="inline-block h-2.5 w-2.5 rounded-full border"
                    style={`background-color: ${tag.color}`}
                    aria-hidden="true"
                  ></span>
                  <span>{tag.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    class="h-5 w-5"
                    onclick={() => removeSelectedTag(tag.id)}
                  >
                    <XIcon />
                  </Button>
                </Badge>
              {/each}
            {/if}

            <CourseTagPicker
              tagGroups={tagApi.tagGroups}
              {selectedTagIds}
              bind:open={isTagPopoverOpen}
              onTagToggle={toggleTagSelection}
              onTagCreated={toggleTagSelection}
            />
          </div>
        </div>
      </Field.Field>

      <SettingsSeparator />

      <Field.Field id="welcome-email" class="scroll-mt-24">
        <Field.Label>
          <a href="#welcome-email" class="hover:underline">{$t('course.navItem.settings.welcome_email.title')}</a>
        </Field.Label>
        <Field.Description>{$t('course.navItem.settings.welcome_email.description')}</Field.Description>
        <TextEditor
          content={$settings.welcomeEmailMessage}
          placeholder={$t('course.navItem.settings.welcome_email.placeholder')}
          class="w-full"
          editorClass="h-auto! max-h-[200px] min-h-[120px]"
          onChange={(text) => {
            $settings.welcomeEmailMessage = text;
            hasUnsavedChanges = true;
          }}
        />
      </Field.Field>
    </Field.Group>
  </SettingsCard>

  <AttentionHighlight
    id={ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].COMPLETION_RULES}
    scrollBlock="start"
    class="scroll-mt-24"
  >
    <SettingsCard
      hash={ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].COMPLETION_RULES}
      title={$t('course.navItem.settings.completion_rules_card_title')}
      description={$t('course.navItem.settings.completion_rules_card_desc')}
    >
      <Field.Group class="gap-4">
        {#if cameFromCertificateSettings && certificateSettingsHref}
          <div class="-my-2">
            <BackButton
              href={certificateSettingsHref}
              label={$t('course.navItem.settings.back_to_certificate_settings')}
              class="px-2! py-2!"
              testId="course-settings-back-to-certificate-settings"
            />
          </div>
        {/if}

        {#if areCompletionRulesLocked}
          <UpgradeBanner>{$t('course.certification.completion_rules_upgrade')}</UpgradeBanner>
        {/if}

        <Field.Field id="progression-mode" class="scroll-mt-24">
          <Field.Label>
            <a href="#progression-mode" class="hover:underline"
              >{$t('course.navItem.settings.progression_mode_title')}</a
            >
          </Field.Label>
          <Field.Description>{$t('course.navItem.settings.progression_mode_description')}</Field.Description>
          <RadioGroup.Root
            value={$settings.progressionMode}
            onValueChange={(value) => {
              if (value === 'free' || value === 'sequential') {
                $settings.progressionMode = value;
                hasUnsavedChanges = true;
              }
            }}
          >
            <div class="flex flex-col gap-3">
              <div class="flex items-center gap-2">
                <RadioGroup.Item value="free" id="progression-free" />
                <Label for="progression-free">{$t('course.navItem.settings.progression_mode_free')}</Label>
              </div>
              <div class="flex items-center gap-2">
                <RadioGroup.Item value="sequential" id="progression-sequential" />
                <Label for="progression-sequential">{$t('course.navItem.settings.progression_mode_sequential')}</Label>
              </div>
            </div>
          </RadioGroup.Root>
        </Field.Field>

        <SettingsSeparator />

        <Field.Field id="recertification" orientation="horizontal" class="scroll-mt-24">
          <Field.Content>
            <Field.Label for="recertification-enabled">
              <a href="#recertification" class="hover:underline">{$t('enrollment.recertification.title')}</a>
            </Field.Label>
            <Field.Description>{$t('enrollment.recertification.description')}</Field.Description>
          </Field.Content>
          <Switch
            id="recertification-enabled"
            checked={$settings.recertificationMonths !== null}
            onCheckedChange={onRecertificationToggle}
          />
        </Field.Field>
        {#if $settings.recertificationMonths !== null}
          <Field.Field>
            <Field.Label for="recertification-months">{$t('enrollment.recertification.months_label')}</Field.Label>
            <Input
              id="recertification-months"
              type="number"
              min="1"
              max="120"
              class="w-32"
              value={$settings.recertificationMonths}
              onchange={onRecertificationMonthsChange}
            />
            <Field.Description>{$t('enrollment.recertification.months_helper')}</Field.Description>
          </Field.Field>
        {/if}

        <SettingsSeparator />

        <AttentionHighlight
          id={ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].VIDEO_RULES}
          scrollBlock="start"
          class="scroll-mt-24"
        >
          <CourseVideoRulesSection
            bind:this={videoRulesSection}
            onChange={() => {
              hasUnsavedChanges = true;
            }}
          />
        </AttentionHighlight>
      </Field.Group>
    </SettingsCard>
  </AttentionHighlight>

  {#if hasLiveSession && courseApi.course?.id}
    <SettingsCard
      id="live-session-reminders"
      title={$t('course.navItem.settings.live_session_reminders.legend')}
      description={$t('course.navItem.settings.live_session_reminders.description')}
    >
      <Field.Group>
        <ReminderPicker
          bind:rows={$settings.liveSessionReminders}
          onchange={() => {
            hasUnsavedChanges = true;
          }}
        />

        <SettingsSeparator />

        <DeliveryLogSheet courseId={courseApi.course.id} timezone={courseApi.course.metadata?.sessionTimezone} />
      </Field.Group>
    </SettingsCard>
  {/if}

  <SettingsCard id="content" title={$t('course.navItem.settings.content_card_title')}>
    <Field.Group>
      <Field.Field id="lesson-tabs" class="scroll-mt-24">
        <Field.Label>
          <a href="#lesson-tabs" class="hover:underline">{$t('course.navItem.settings.order')}</a>
        </Field.Label>
        <Field.Description>{$t('course.navItem.settings.drag')}</Field.Description>
        <ReorderMaterialTabs
          bind:tabs={$settings.tabs}
          onchange={() => {
            hasUnsavedChanges = true;
          }}
        />
      </Field.Field>

      <SettingsSeparator />

      <Field.Field class="scroll-mt-24" orientation="horizontal">
        <Field.Content>
          <Field.Label for="content-grouping">
            <a href="#content-grouping" class="hover:underline"
              >{$t('course.navItem.settings.content_grouping_title')}</a
            >
          </Field.Label>
          <Field.Description>{$t('course.navItem.settings.content_grouping_description')}</Field.Description>
        </Field.Content>
        <Switch
          id="content-grouping"
          checked={$settings.isContentGroupingEnabled}
          onCheckedChange={(checked) => {
            $settings.isContentGroupingEnabled = checked;
            hasUnsavedChanges = true;
          }}
        />
      </Field.Field>

      <SettingsSeparator />

      <AttentionHighlight id={ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].COURSE_COMMENTS} class="scroll-mt-24">
        <Field.Field orientation="horizontal" class="scroll-mt-24">
          <Field.Content>
            <Field.Label>
              <a href="#{ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].COURSE_COMMENTS}" class="hover:underline"
                >{$t('course.navItem.settings.comments.title')}</a
              >
            </Field.Label>
            <Field.Description>{$t('course.navItem.settings.comments.description')}</Field.Description>
          </Field.Content>
          <Switch
            id="course-comments"
            checked={$settings.commentsEnabled}
            onCheckedChange={(checked) => {
              $settings.commentsEnabled = checked;
              hasUnsavedChanges = true;
            }}
          />
        </Field.Field>
      </AttentionHighlight>
    </Field.Group>
  </SettingsCard>

  <SettingsCard id="access" title={$t('course.navItem.settings.access_card_title')}>
    <Field.Group>
      {#if !courseApi.course?.isTemplate}
        <Field.Set id="self-enrollment" class="scroll-mt-24">
          <Field.Field orientation="horizontal">
            <Field.Content>
              <Field.Label for="allow-self-enrollment">
                <a href="#self-enrollment" class="hover:underline">{$t('training_library.settings_self_enrollment')}</a>
              </Field.Label>
              <Field.Description>
                {$t('training_library.settings_self_enrollment_hint')}
              </Field.Description>
            </Field.Content>
            <Switch
              id="allow-self-enrollment"
              checked={$settings.allowSelfEnrollment}
              onCheckedChange={(checked) => {
                $settings.allowSelfEnrollment = checked;
                hasUnsavedChanges = true;
              }}
            />
          </Field.Field>
        </Field.Set>

        <SettingsSeparator />
      {/if}

      {#if !courseApi.course?.isTemplate}
        <Field.Set id="publish" class="scroll-mt-24">
          <AttentionHighlight id="publish">
            <Field.Field orientation="horizontal">
              <Field.Content>
                <Field.Label for="is-published">
                  <a href="#publish" class="hover:underline">{$t('course.navItem.settings.publish')}</a>
                </Field.Label>
                <Field.Description>{$t('course.navItem.settings.determines')}</Field.Description>
              </Field.Content>
              <Switch id="is-published" checked={$settings.isPublished} onCheckedChange={onPublishToggle} />
            </Field.Field>
          </AttentionHighlight>

          {#if showLockedContentNotice}
            <Alert.Root variant={hasLiveSession ? 'information' : 'warning'}>
              <LockOpenIcon />
              <Alert.Title>
                {$t('course.navItem.settings.locked_content.title', { count: lockedContentItems.length })}
              </Alert.Title>
              <Alert.Description>
                {hasLiveSession
                  ? $t('course.navItem.settings.locked_content.description_live')
                  : $t('course.navItem.settings.locked_content.description')}
                <Button
                  variant="outline"
                  size="sm"
                  class="mt-2 w-fit"
                  loading={isUnlockingAll}
                  disabled={isUnlockingAll}
                  onclick={handleUnlockAllContent}
                >
                  {$t('course.navItem.settings.locked_content.unlock_all')}
                </Button>
              </Alert.Description>
            </Alert.Root>
          {/if}
        </Field.Set>

        <SettingsSeparator />
      {/if}

      {#if $isFreePlan}
        <UpgradeBanner>{$t('upgrade.download_lessons')}</UpgradeBanner>
      {:else}
        <Field.Field class="scroll-mt-24" orientation="horizontal">
          <Field.Content>
            <Field.Label for="lesson-download">
              <a href="#lesson-download" class="hover:underline">{$t('course.navItem.settings.lesson_download')}</a>
            </Field.Label>
            <Field.Description>{$t('course.navItem.settings.available')}</Field.Description>
          </Field.Content>
          <Switch
            id="lesson-download"
            checked={$settings.lessonDownload}
            onCheckedChange={(checked) => {
              $settings.lessonDownload = checked;
              hasUnsavedChanges = true;
            }}
          />
        </Field.Field>
      {/if}

      <SettingsSeparator />

      {#if $isFreePlan}
        <UpgradeBanner>{$t('upgrade.download_course')}</UpgradeBanner>
      {:else}
        <Field.Field id="course-download" class="scroll-mt-24" orientation="horizontal">
          <Field.Content>
            <Field.Label>
              <a href="#course-download" class="hover:underline">{$t('course.navItem.settings.course_download')}</a>
            </Field.Label>
            <Field.Description>{$t('course.navItem.settings.course_avail')}</Field.Description>
          </Field.Content>
          <Button variant="outline" onclick={downloadCourse} disabled={isLoading} loading={isLoading}>
            {$t('course.navItem.settings.download')}
          </Button>
        </Field.Field>
      {/if}

      <SettingsSeparator />

      <Field.Field id="markdown-export" class="scroll-mt-24" orientation="horizontal">
        <Field.Content>
          <Field.Label for="allow-markdown-export">
            <a href="#markdown-export" class="hover:underline">{$t('course.navItem.settings.allow_markdown_export')}</a>
          </Field.Label>
          <Field.Description>{$t('course.navItem.settings.allow_markdown_export_description')}</Field.Description>
        </Field.Content>
        <Switch
          id="allow-markdown-export"
          checked={$settings.allowMarkdownExport}
          onCheckedChange={(checked) => {
            $settings.allowMarkdownExport = checked;
            hasUnsavedChanges = true;
          }}
        />
      </Field.Field>
    </Field.Group>
  </SettingsCard>

  <TemplateSettingsSection />

  <SettingsCard
    id="delete"
    title={$t('course.navItem.settings.delete')}
    description={$t('course.navItem.settings.delete_text')}
  >
    <Button
      variant="destructive"
      onclick={() => (openDeleteModal = true)}
      loading={isDeleting}
      disabled={isDeleting}
      class="w-fit!"
    >
      {$t('course.navItem.settings.delete')}
    </Button>
  </SettingsCard>
</div>
