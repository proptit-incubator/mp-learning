<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import * as Card from '@cio/ui/base/card';
  import { SvelteDate } from 'svelte/reactivity';
  import type { AiUsageData } from '$features/settings/utils/types';
  import { formatAiUnits, estimateAiCostUsd } from './units';

  interface Props {
    usage: AiUsageData | null;
  }

  let { usage }: Props = $props();

  const percent = $derived(
    usage && usage.allowance > 0 ? Math.min(100, Math.round((usage.used / usage.allowance) * 100)) : 0
  );

  const resetDate = $derived.by(() => {
    const nextReset = new SvelteDate();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);

    return nextReset.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
  });
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
  <Card.Root class="sm:col-span-2">
    <Card.Header>
      <Card.Description>{$t('settings.ai.usage.used_this_month')}</Card.Description>
      <Card.Title class="text-2xl tabular-nums" data-testid="ai-usage-used">
        {#if usage}
          {formatAiUnits(usage.used)}
          <span class="ui:text-muted-foreground text-base font-normal">/ {formatAiUnits(usage.allowance)}</span>
        {:else}
          —
        {/if}
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <div
        class="ui:bg-muted h-2 w-full rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={$t('settings.ai.usage.used_this_month')}
      >
        <div
          class="h-2 rounded-full transition-all {percent > 90
            ? 'bg-red-500'
            : percent > 70
              ? 'bg-amber-500'
              : 'ui:bg-primary'}"
          style="width: {percent}%"
        ></div>
      </div>
      <p class="ui:text-muted-foreground mt-2 text-xs">
        {$t('settings.ai.usage.resets_on', { percent, date: resetDate })}
      </p>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Description>{$t('settings.ai.usage.estimated_cost')}</Card.Description>
      <Card.Title class="text-2xl tabular-nums">
        {usage ? estimateAiCostUsd(usage.used) : '—'}
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <p class="ui:text-muted-foreground text-xs">
        {$t('settings.ai.usage.requests', { count: (usage?.requestsThisMonth ?? 0).toLocaleString('vi-VN') })}
      </p>
    </Card.Content>
  </Card.Root>
</div>
