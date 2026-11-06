<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Button } from '@cio/ui/base/button';
  import { Input } from '@cio/ui/base/input';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Spinner } from '@cio/ui/base/spinner';
  import { Empty } from '@cio/ui/custom/empty';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import MicIcon from '@lucide/svelte/icons/mic';
  import MicOffIcon from '@lucide/svelte/icons/mic-off';
  import PhoneIcon from '@lucide/svelte/icons/phone';
  import PhoneOffIcon from '@lucide/svelte/icons/phone-off';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import XIcon from '@lucide/svelte/icons/x';

  import { currentOrg, isOrgTeamMember } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import { PracticeCallController } from '$features/practice/api/practice-call.svelte';
  import {
    CallFeedbackCard,
    CallHeader,
    CallRecordingBar,
    CallTranscript,
    ScenarioBriefCard
  } from '$features/practice/components';

  interface Props {
    scenarioId: string;
  }

  let { scenarioId }: Props = $props();

  const CATALOG_HREF = '/lms/practice';
  const controller = new PracticeCallController();

  let draftText = $state('');
  let loadedOrgId = '';

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === loadedOrgId) return;

    loadedOrgId = organizationId;
    if (!practiceApi.scenarios) void practiceApi.listScenarios();
    if (!practiceApi.capabilities) void practiceApi.loadCapabilities();
    if ($isOrgTeamMember && !practiceApi.managedScenarios) void practiceApi.listManagedScenarios(true);
  });

  onDestroy(() => controller.dispose());

  const listedScenario = $derived(
    practiceApi.scenarios?.find((scenario) => scenario.id === scenarioId) ??
      practiceApi.managedScenarios?.find((scenario) => scenario.id === scenarioId) ??
      null
  );
  const scenario = $derived(controller.call?.scenario ?? listedScenario);
  const isLoadingScenario = $derived(
    !scenario && (practiceApi.scenarios === null || ($isOrgTeamMember && practiceApi.managedScenarios === null))
  );
  const aiUnavailable = $derived(practiceApi.capabilities?.aiAvailable === false);
  const micLabel = $derived(
    !controller.speechToText
      ? $t('practice.call.mic_unavailable')
      : $t(controller.micOn ? 'practice.call.mic_turn_off' : 'practice.call.mic_turn_on')
  );
  const micRingWidth = $derived(controller.micOn ? 2 + Math.round(controller.micLevel * 6) : 0);

  function handleStart() {
    void controller.start(scenarioId);
  }

  function handleSend() {
    if (controller.sendText(draftText)) draftText = '';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;

    event.preventDefault();
    handleSend();
  }

  async function handleEnd() {
    await controller.end();

    if (controller.phase === 'ended') void practiceApi.listHistory();
  }
</script>

<div class="flex w-full flex-col gap-3 pt-2 pb-10">
  <Button href={CATALOG_HREF} variant="ghost" size="sm" class="self-start">
    <ArrowLeftIcon class="size-4" />
    {$t('practice.call.back_to_catalog')}
  </Button>

  {#if !scenario}
    {#if isLoadingScenario}
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton class="h-[560px] w-full rounded-2xl" />
        <Skeleton class="h-64 w-full rounded-2xl" />
      </div>
    {:else}
      <Empty title={$t('practice.call.scenario_missing')} icon={PhoneOffIcon} variant="page">
        <Button href={CATALOG_HREF}>{$t('practice.call.back_to_catalog')}</Button>
      </Empty>
    {/if}
  {:else}
    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section
        class="ui:bg-card flex h-[calc(100dvh-10rem)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border"
      >
        <CallHeader
          {scenario}
          phase={controller.phase}
          elapsedSeconds={controller.elapsedSeconds}
          customerSpeaking={controller.customerSpeaking}
          micLevel={controller.micLevel}
          speakerMuted={controller.speakerMuted}
          onToggleSpeaker={() => controller.toggleSpeaker()}
        />
        {#if controller.phase === 'ended' && controller.call}
          <CallRecordingBar call={controller.call} />
        {/if}

        <CallTranscript
          customerName={scenario.customerName}
          messages={controller.messages}
          agentDraft={controller.agentDraft}
          customerTyping={controller.customerTyping}
        >
          {#snippet empty()}
            {#if controller.phase === 'idle'}
              <div class="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 text-center">
                <span class="ui:bg-primary/10 ui:text-primary flex size-14 items-center justify-center rounded-full">
                  <PhoneIcon class="size-6" />
                </span>
                <p class="ui:text-muted-foreground text-sm">
                  {$t('practice.call.start_hint', { name: scenario.customerName })}
                </p>
              </div>
            {/if}
          {/snippet}
        </CallTranscript>

        {#if controller.notice}
          <div class="ui:bg-warning-soft ui:text-warning-foreground flex items-center gap-2 px-4 py-2 text-xs">
            <p class="flex-1">{$t(`practice.notice.${controller.notice}`)}</p>
            <IconButton
              variant="secondary"
              size="icon-xs"
              class="shrink-0"
              aria-label={$t('practice.notice.dismiss')}
              onclick={() => controller.dismissNotice()}
            >
              <XIcon class="size-3.5" />
            </IconButton>
          </div>
        {/if}

        <footer class="border-t px-4 py-3">
          {#if controller.phase === 'idle'}
            <div class="flex justify-center">
              <Button size="lg" disabled={aiUnavailable} onclick={handleStart} testId="practice-call-start">
                <PhoneIcon class="size-4" />
                {$t('practice.call.start')}
              </Button>
            </div>
          {:else if controller.phase === 'connecting'}
            <p class="ui:text-muted-foreground flex items-center justify-center gap-2 py-2 text-sm">
              <Spinner class="size-4" />
              {$t('practice.call.connecting')}
            </p>
          {:else if controller.phase === 'ending'}
            <p class="ui:text-muted-foreground flex items-center justify-center gap-2 py-2 text-sm">
              <Spinner class="size-4" />
              {$t('practice.call.grading')}
            </p>
          {:else if controller.phase === 'live'}
            <div class="flex items-center gap-2">
              <IconButton
                variant="secondary"
                size="icon-lg"
                class="rounded-full transition-shadow {controller.micOn ? 'ui:text-primary' : ''}"
                style="box-shadow: 0 0 0 {micRingWidth}px color-mix(in oklab, var(--primary) 35%, transparent)"
                disabled={!controller.speechToText || controller.micStarting}
                onclick={() => controller.toggleMic()}
                aria-label={micLabel}
                title={micLabel}
              >
                {#if controller.micOn}
                  <MicIcon class="size-5" />
                {:else}
                  <MicOffIcon class="size-5" />
                {/if}
              </IconButton>
              <Input
                class="h-10 flex-1 rounded-full"
                bind:value={draftText}
                placeholder={$t('practice.call.input_placeholder')}
                onkeydown={handleKeydown}
              />
              <Button variant="light-default" disabled={!draftText.trim()} onclick={handleSend}>
                {$t('practice.call.send')}
              </Button>
              <Button variant="destructive" onclick={handleEnd} testId="practice-call-end">
                <PhoneOffIcon class="size-4" />
                <span class="hidden sm:inline">{$t('practice.call.end')}</span>
              </Button>
            </div>
          {:else if controller.phase === 'failed'}
            <div class="flex flex-col items-center gap-3 py-1 text-center">
              <p class="ui:text-muted-foreground text-sm">
                {$t(`practice.failure.${controller.failure ?? 'connection_lost'}`)}
              </p>
              <div class="flex flex-wrap justify-center gap-2">
                {#if controller.call && controller.failure === 'connection_lost'}
                  <Button variant="outline" onclick={() => controller.reconnect()}>
                    {$t('practice.call.reconnect')}
                  </Button>
                {/if}
                {#if controller.call}
                  <Button variant="destructive" onclick={handleEnd}>{$t('practice.call.end_and_grade')}</Button>
                {:else}
                  <Button onclick={handleStart}>{$t('practice.call.start')}</Button>
                {/if}
              </div>
            </div>
          {:else}
            <div class="flex flex-wrap justify-center gap-2">
              <Button onclick={() => controller.resetForRetry()}>
                <RotateCcwIcon class="size-4" />
                {$t('practice.call.retry')}
              </Button>
              <Button variant="outline" href={CATALOG_HREF}>{$t('practice.call.choose_another')}</Button>
            </div>
          {/if}
        </footer>
      </section>

      <aside class="flex min-w-0 flex-col gap-6">
        {#if controller.phase === 'ended' && controller.call}
          <CallFeedbackCard call={controller.call} />
        {/if}
        <ScenarioBriefCard {scenario} />
      </aside>
    </div>
  {/if}
</div>
