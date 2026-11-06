<script lang="ts">
  import AudioLinesIcon from '@lucide/svelte/icons/audio-lines';

  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { formatRecordingDate } from '$features/practice/utils/practice-utils';
  import type { PracticeCallDetail } from '$features/practice/utils/types';

  interface Props {
    call: PracticeCallDetail;
    currentTime?: number;
    paused?: boolean;
  }

  let { call, currentTime = $bindable(0), paused = $bindable(true) }: Props = $props();

  const intlLocale = getIntlLocale();
</script>

<div
  class="ui:bg-muted/40 flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 md:px-5"
  data-testid="practice-call-recording"
>
  <span class="ui:text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs font-medium">
    <AudioLinesIcon class="size-4" />
    {$t('practice.recording.title')}
  </span>

  {#if call.recordingUrl}
    <audio class="h-9 min-w-0 flex-1" controls preload="metadata" src={call.recordingUrl} bind:currentTime bind:paused>
      <track kind="captions" />
    </audio>
    {#if call.recordingExpiresAt}
      <span class="ui:text-muted-foreground shrink-0 text-xs">
        {$t('practice.recording.kept_until', { date: formatRecordingDate(call.recordingExpiresAt, intlLocale) })}
      </span>
    {/if}
  {:else if call.recordingDeletedAt}
    <p class="ui:text-muted-foreground min-w-0 flex-1 text-xs">
      {$t('practice.recording.deleted', { date: formatRecordingDate(call.recordingDeletedAt, intlLocale) })}
    </p>
  {:else}
    <p class="ui:text-muted-foreground min-w-0 flex-1 text-xs">{$t('practice.recording.unavailable')}</p>
  {/if}
</div>
