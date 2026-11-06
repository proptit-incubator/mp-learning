<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Empty } from '@cio/ui/custom/empty';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import PhoneOffIcon from '@lucide/svelte/icons/phone-off';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';

  import { currentOrg, isOrgTeamMember } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import {
    CallFeedbackCard,
    CallHeader,
    CallInfoCard,
    CallRecordingBar,
    CallReviewCard,
    CallTranscript,
    ScenarioBriefCard
  } from '$features/practice/components';
  import { activeTranscriptMessageId } from '$features/practice/utils/practice-utils';
  import type { PracticeCallDetail, PracticeChatMessage } from '$features/practice/utils/types';

  interface Props {
    callId: string;
    backHref: string;
    backLabel: string;
    retryHref?: (scenarioId: string) => string;
  }

  let { callId, backHref, backLabel, retryHref }: Props = $props();

  let call = $state<PracticeCallDetail | null>(null);
  let notFound = $state(false);
  let isEnding = $state(false);
  let playbackTime = $state(0);
  let playbackPaused = $state(true);
  let loadedKey = '';

  $effect(() => {
    const organizationId = $currentOrg.id;
    const loadKey = `${organizationId}:${callId}`;
    if (!organizationId || loadKey === loadedKey) return;

    loadedKey = loadKey;
    void loadCall();
  });

  async function loadCall() {
    call = null;
    notFound = false;

    const detail = await practiceApi.getCall(callId);
    call = detail;
    notFound = !detail;
  }

  async function endAndGrade() {
    isEnding = true;
    const ended = await practiceApi.endCall(callId);
    isEnding = false;

    if (ended) call = ended;
  }

  const messages = $derived<PracticeChatMessage[]>(
    (call?.transcript ?? []).map((turn, index) => ({
      id: `turn-${index}`,
      speaker: turn.speaker,
      text: turn.text,
      pending: false,
      offsetSeconds: call?.recordingUrl ? turn.offsetSeconds : undefined
    }))
  );
  const playingMessageId = $derived(playbackTime > 0 ? activeTranscriptMessageId(messages, playbackTime) : null);

  function playFrom(message: PracticeChatMessage) {
    if (message.offsetSeconds === undefined) return;

    playbackTime = message.offsetSeconds;
    playbackPaused = false;
  }
  const canFinish = $derived(call?.status === 'ACTIVE' && call.profileId === $profile.id);
</script>

<div class="flex w-full flex-col gap-3 pt-2 pb-10">
  <Button href={backHref} variant="ghost" size="sm" class="self-start">
    <ArrowLeftIcon class="size-4" />
    {backLabel}
  </Button>

  {#if notFound}
    <Empty title={$t('practice.errors.call_not_found')} icon={PhoneOffIcon} variant="page" />
  {:else if !call}
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Skeleton class="h-[560px] w-full rounded-2xl" />
      <Skeleton class="h-64 w-full rounded-2xl" />
    </div>
  {:else}
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <ScenarioBriefCard scenario={call.scenario} />
      <div class="flex min-w-0 flex-col gap-6">
        <CallInfoCard {call} />
        <CallReviewCard {call} canReview={$isOrgTeamMember === true} onSaved={(updated) => (call = updated)} />
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section
        class="ui:bg-card flex h-[calc(100dvh-10rem)] min-h-[480px] min-w-0 flex-col overflow-hidden rounded-2xl border"
      >
        <CallHeader
          scenario={call.scenario}
          phase={call.status === 'ENDED' ? 'ended' : 'failed'}
          elapsedSeconds={call.durationSeconds ?? 0}
        />
        {#if call.status === 'ENDED'}
          <CallRecordingBar {call} bind:currentTime={playbackTime} bind:paused={playbackPaused} />
        {/if}
        <CallTranscript
          customerName={call.scenario.customerName}
          {messages}
          activeMessageId={playingMessageId}
          onSelectMessage={playFrom}
        >
          {#snippet empty()}
            <p class="ui:text-muted-foreground py-10 text-center text-sm">{$t('practice.review.empty_transcript')}</p>
          {/snippet}
        </CallTranscript>
        {#if canFinish || retryHref}
          <footer class="flex flex-wrap justify-center gap-2 border-t px-4 py-3">
            {#if canFinish}
              <Button variant="destructive" loading={isEnding} onclick={endAndGrade}>
                {$t('practice.call.end_and_grade')}
              </Button>
            {/if}
            {#if retryHref}
              <Button variant={canFinish ? 'outline' : 'default'} href={retryHref(call.scenario.id)}>
                <RotateCcwIcon class="size-4" />
                {$t('practice.call.retry')}
              </Button>
            {/if}
          </footer>
        {/if}
      </section>

      <aside class="flex min-w-0 flex-col gap-6">
        <CallFeedbackCard {call} onUpdated={(updated) => (call = updated)} />
      </aside>
    </div>
  {/if}
</div>
