<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { PercentRingProgress } from '@cio/ui/custom/percent-ring-progress';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import TrendingUpIcon from '@lucide/svelte/icons/trending-up';

  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import { formatCallDuration, scoreToneClass } from '$features/practice/utils/practice-utils';
  import type { PracticeCallDetail } from '$features/practice/utils/types';

  interface Props {
    call: PracticeCallDetail;
    onUpdated?: (call: PracticeCallDetail) => void;
  }

  let { call, onUpdated }: Props = $props();

  async function regrade() {
    const updated = await practiceApi.regradeCall(call.id);
    if (updated) onUpdated?.(updated);
  }

  const feedback = $derived(call.feedback);
  const agentSpoke = $derived(call.transcript.some((turn) => turn.speaker === 'agent'));
</script>

<section class="ui:bg-card rounded-2xl border p-5">
  <div class="flex items-center justify-between gap-3">
    <p class="text-sm font-semibold">{$t('practice.feedback.title')}</p>
    {#if call.durationSeconds !== null}
      <span class="ui:text-muted-foreground text-xs">
        {$t('practice.feedback.duration', { duration: formatCallDuration(call.durationSeconds) })}
      </span>
    {/if}
  </div>

  {#if call.status !== 'ENDED'}
    <p class="ui:text-muted-foreground mt-3 text-sm">{$t('practice.feedback.not_finished')}</p>
  {:else if !feedback}
    <p class="ui:text-muted-foreground mt-3 text-sm">
      {$t(agentSpoke ? 'practice.feedback.failed' : 'practice.feedback.no_feedback')}
    </p>
    {#if agentSpoke && onUpdated}
      <Button
        size="sm"
        variant="outline"
        class="mt-3"
        loading={practiceApi.isGrading}
        onclick={regrade}
        testId="practice-call-regrade"
      >
        {$t('practice.feedback.regrade')}
      </Button>
    {/if}
  {:else}
    <div class="mt-4 flex items-center gap-4">
      <PercentRingProgress value={feedback.score} size="default" />
      <p class="text-3xl font-bold tabular-nums {scoreToneClass(feedback.score)}">
        {feedback.score}<span class="ui:text-muted-foreground text-base font-medium"
          >{$t('practice.feedback.score_suffix')}</span
        >
      </p>
    </div>
    <p class="mt-3 text-sm leading-relaxed">{feedback.summary}</p>

    {#if feedback.criteria.length}
      <p class="mt-5 text-xs font-semibold tracking-wide uppercase">{$t('practice.feedback.criteria')}</p>
      <ul class="mt-2 space-y-3">
        {#each feedback.criteria as criterion (criterion.name)}
          <li>
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="font-medium">{criterion.name}</span>
              <span class="shrink-0 tabular-nums {scoreToneClass(criterion.score * 10)}">{criterion.score}/10</span>
            </div>
            <Progress value={criterion.score * 10} class="mt-1.5 h-1.5" />
            <p class="ui:text-muted-foreground mt-1 text-xs">{criterion.comment}</p>
          </li>
        {/each}
      </ul>
    {/if}

    {#if feedback.strengths.length}
      <p class="mt-5 text-xs font-semibold tracking-wide uppercase">{$t('practice.feedback.strengths')}</p>
      <ul class="mt-2 space-y-1.5">
        {#each feedback.strengths as strength (strength)}
          <li class="flex gap-2 text-sm">
            <CircleCheckIcon class="ui:text-success-foreground mt-0.5 size-4 shrink-0" />
            <span>{strength}</span>
          </li>
        {/each}
      </ul>
    {/if}

    {#if feedback.improvements.length}
      <p class="mt-5 text-xs font-semibold tracking-wide uppercase">{$t('practice.feedback.improvements')}</p>
      <ul class="mt-2 space-y-1.5">
        {#each feedback.improvements as improvement (improvement)}
          <li class="flex gap-2 text-sm">
            <TrendingUpIcon class="ui:text-warning-foreground mt-0.5 size-4 shrink-0" />
            <span>{improvement}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
