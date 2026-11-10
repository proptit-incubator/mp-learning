<script lang="ts">
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import PlayCircleIcon from '@lucide/svelte/icons/circle-play';
  import { t } from '$lib/utils/functions/translations';
  import { lessonApi } from '$features/course/api';
  import { getLessonWatchedPercent } from '$features/course/utils/lesson-completion-state';

  const DEFAULT_WATCH_THRESHOLD = 95;

  const watchProgress = $derived(lessonApi.lesson?.watchProgress);
  const threshold = $derived(lessonApi.lesson?.videoWatchThreshold ?? DEFAULT_WATCH_THRESHOLD);
  const watchedPercent = $derived(Math.round(getLessonWatchedPercent(watchProgress)));
  const isComplete = $derived(Boolean(watchProgress?.isComplete || lessonApi.lesson?.isComplete));
  const displayPercent = $derived(isComplete ? 100 : watchedPercent);
  const videosRequired = $derived(watchProgress?.videosRequired ?? 0);
  const videosComplete = $derived(watchProgress?.videosComplete ?? 0);

  const statusLabel = $derived(
    videosRequired > 1
      ? $t('course.navItem.lessons.watch_progress.videos_complete', {
          complete: videosComplete,
          required: videosRequired,
          percent: displayPercent
        })
      : $t('course.navItem.lessons.watch_progress.status', { percent: displayPercent })
  );
</script>

<section
  class="ui:bg-card ui:shadow-card rounded-xl border px-4 py-3 md:px-6"
  aria-label={$t('course.navItem.lessons.watch_progress.bar_label')}
  data-testid="lesson-watch-progress"
>
  <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
    <span class="flex min-w-0 items-center gap-1.5 font-medium">
      {#if isComplete}
        <CircleCheckIcon size={16} class="shrink-0 text-emerald-600" />
        {$t('course.navItem.lessons.watch_progress.completed')}
      {:else}
        <PlayCircleIcon size={16} class="ui:text-primary shrink-0" />
        {statusLabel}
      {/if}
    </span>
    {#if !isComplete}
      <span class="ui:text-muted-foreground text-xs">
        {$t('course.navItem.lessons.watch_progress.threshold_hint', { threshold })}
      </span>
    {/if}
  </div>

  <div
    class="ui:bg-muted relative h-2.5 w-full rounded-full"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={displayPercent}
    aria-valuetext={statusLabel}
  >
    <div
      class="h-full rounded-full transition-[width] duration-500 {isComplete ? 'bg-emerald-600' : 'ui:bg-primary'}"
      style="width: {displayPercent}%"
    ></div>
    {#if !isComplete && threshold < 100}
      <div
        class="ui:bg-foreground absolute -top-1 -bottom-1 w-0.5 rounded-full"
        style="left: {threshold}%"
        title={$t('course.navItem.lessons.watch_progress.threshold_marker', { threshold })}
      ></div>
    {/if}
  </div>
</section>
