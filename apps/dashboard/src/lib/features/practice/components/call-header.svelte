<script lang="ts">
  import { IconButton } from '@cio/ui/custom/icon-button';
  import Volume2Icon from '@lucide/svelte/icons/volume-2';
  import VolumeXIcon from '@lucide/svelte/icons/volume-x';

  import { t } from '$lib/utils/functions/translations';
  import CustomerAvatar from './customer-avatar.svelte';
  import DifficultyIndicator from './difficulty-indicator.svelte';
  import { formatCallDuration } from '$features/practice/utils/practice-utils';
  import type { PracticeCallPhase, PracticeCallScenario } from '$features/practice/utils/types';

  interface Props {
    scenario: PracticeCallScenario;
    phase: PracticeCallPhase;
    elapsedSeconds: number;
    customerSpeaking?: boolean;
    micLevel?: number;
    speakerMuted?: boolean;
    onToggleSpeaker?: () => void;
  }

  let {
    scenario,
    phase,
    elapsedSeconds,
    customerSpeaking = false,
    micLevel = 0,
    speakerMuted = false,
    onToggleSpeaker
  }: Props = $props();

  const BAR_SHAPE = [0.35, 0.7, 0.5, 1, 0.6, 0.85, 0.4, 0.75, 0.55];

  const STATUS_KEYS: Record<PracticeCallPhase, string> = {
    idle: 'practice.call.status_idle',
    connecting: 'practice.call.status_connecting',
    live: 'practice.call.status_live',
    ending: 'practice.call.status_live',
    ended: 'practice.call.status_ended',
    failed: 'practice.call.status_failed'
  };

  const isLive = $derived(phase === 'live' || phase === 'ending');
  const showsTimer = $derived(phase === 'connecting' || isLive);
  const activity = $derived(customerSpeaking ? 1 : micLevel);
</script>

<header class="flex items-center gap-3 border-b px-4 py-3 md:px-5">
  <CustomerAvatar name={scenario.customerName} size="lg" />
  <div class="min-w-0 flex-1">
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <p class="truncate text-sm font-semibold md:text-base">{scenario.customerName}</p>
      <span
        class="inline-flex items-center gap-1 text-[11px] font-semibold uppercase {isLive
          ? 'ui:text-danger-foreground'
          : 'ui:text-muted-foreground'}"
      >
        <span class="size-1.5 rounded-full bg-current {isLive ? 'animate-pulse' : ''}"></span>
        {$t(STATUS_KEYS[phase])}
      </span>
      <DifficultyIndicator difficulty={scenario.difficulty} class="text-[11px]" />
    </div>
    <p class="ui:text-muted-foreground truncate text-xs">{scenario.title}</p>
  </div>

  {#if onToggleSpeaker && isLive}
    <IconButton
      variant="secondary"
      size="icon-sm"
      onclick={onToggleSpeaker}
      aria-label={$t(speakerMuted ? 'practice.call.speaker_unmute' : 'practice.call.speaker_mute')}
    >
      {#if speakerMuted}
        <VolumeXIcon class="size-4" />
      {:else}
        <Volume2Icon class="size-4" />
      {/if}
    </IconButton>
  {/if}

  {#if showsTimer}
    <div class="ui:text-primary hidden h-6 items-center gap-0.5 sm:flex" aria-hidden="true">
      {#each BAR_SHAPE as shape, index (index)}
        <span
          class="w-[3px] rounded-full bg-current transition-[height] duration-150 {customerSpeaking
            ? 'animate-pulse'
            : ''}"
          style="height: {Math.max(4, Math.round(24 * shape * (isLive ? Math.max(activity, 0.15) : 0.15)))}px"
        ></span>
      {/each}
    </div>
    <span class="ui:text-primary w-11 text-right text-sm font-semibold tabular-nums">
      {formatCallDuration(elapsedSeconds)}
    </span>
  {/if}
</header>
