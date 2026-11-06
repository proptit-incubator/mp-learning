<script lang="ts">
  import { Progress } from '@cio/ui/base/progress';
  import { Skeleton } from '@cio/ui/base/skeleton';

  import { t } from '$lib/utils/functions/translations';
  import { calDateDiff } from '$lib/utils/functions/date';
  import {
    scoreToneClass,
    scoreTrendPoints,
    toPracticeMinutes,
    weakestCriteria
  } from '$features/practice/utils/practice-utils';
  import type { MyPracticeStats } from '$features/practice/utils/types';

  interface Props {
    stats: MyPracticeStats | null;
  }

  let { stats }: Props = $props();

  const TREND_WIDTH = 280;
  const TREND_HEIGHT = 72;
  const WEAK_CRITERIA_LIMIT = 3;

  const totals = $derived(stats?.totals);
  const trendPoints = $derived(
    scoreTrendPoints(
      (stats?.trend ?? []).map((point) => point.score),
      TREND_WIDTH,
      TREND_HEIGHT
    )
  );
  const trendPath = $derived(trendPoints.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '));
  const focusCriteria = $derived(weakestCriteria(stats?.criteria ?? [], WEAK_CRITERIA_LIMIT));
  const tiles = $derived([
    { key: 'calls', label: $t('practice.stats.calls'), value: String(totals?.callCount ?? 0), tone: '' },
    {
      key: 'average',
      label: $t('practice.stats.average'),
      value: totals?.averageScore === null || totals?.averageScore === undefined ? '—' : String(totals.averageScore),
      tone: scoreToneClass(totals?.averageScore ?? null)
    },
    {
      key: 'best',
      label: $t('practice.stats.best'),
      value: totals?.bestScore === null || totals?.bestScore === undefined ? '—' : String(totals.bestScore),
      tone: scoreToneClass(totals?.bestScore ?? null)
    },
    {
      key: 'minutes',
      label: $t('practice.stats.minutes'),
      value: String(toPracticeMinutes(totals?.totalSeconds ?? 0)),
      tone: ''
    }
  ]);
</script>

<section class="ui:bg-card rounded-2xl border p-5" data-testid="practice-my-stats">
  <p class="text-sm font-semibold">{$t('practice.stats.my_title')}</p>

  {#if !stats}
    <Skeleton class="mt-3 h-40 w-full rounded-lg" />
  {:else if stats.totals.callCount === 0}
    <p class="ui:text-muted-foreground mt-2 text-xs">{$t('practice.stats.my_empty')}</p>
  {:else}
    <dl class="mt-3 grid grid-cols-2 gap-2">
      {#each tiles as tile (tile.key)}
        <div class="ui:bg-muted/50 rounded-lg px-3 py-2">
          <dt class="ui:text-muted-foreground text-xs">{tile.label}</dt>
          <dd class="text-xl font-semibold tabular-nums {tile.tone}">{tile.value}</dd>
        </div>
      {/each}
    </dl>

    {#if stats.trend.length > 1}
      <p class="mt-4 text-xs font-semibold tracking-wide uppercase">{$t('practice.stats.trend')}</p>
      <svg
        viewBox="-6 -6 {TREND_WIDTH + 12} {TREND_HEIGHT + 12}"
        class="mt-2 h-auto max-h-32 w-full overflow-visible"
        role="img"
        aria-label={$t('practice.stats.trend_label', { count: stats.trend.length })}
      >
        {#each [50, 80] as threshold (threshold)}
          <line
            x1="0"
            x2={TREND_WIDTH}
            y1={TREND_HEIGHT - (threshold / 100) * TREND_HEIGHT}
            y2={TREND_HEIGHT - (threshold / 100) * TREND_HEIGHT}
            class="ui:stroke-border"
            stroke-dasharray="3 3"
          />
        {/each}
        <polyline points={trendPath} fill="none" stroke-width="2" class="ui:stroke-primary" />
        {#each stats.trend as point, index (point.callId)}
          <circle
            cx={trendPoints[index].x}
            cy={trendPoints[index].y}
            r="4"
            stroke-width="2"
            class="ui:fill-primary ui:stroke-card"
          >
            <title>{point.score} · {calDateDiff(point.startedAt)}</title>
          </circle>
        {/each}
      </svg>
    {/if}

    {#if focusCriteria.length}
      <p class="mt-4 text-xs font-semibold tracking-wide uppercase">{$t('practice.stats.focus')}</p>
      <ul class="mt-2 space-y-2.5">
        {#each focusCriteria as criterion (criterion.name)}
          <li>
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate">{criterion.name}</span>
              <span class="shrink-0 tabular-nums {scoreToneClass(criterion.averageScore * 10)}">
                {criterion.averageScore}/10
              </span>
            </div>
            <Progress value={criterion.averageScore * 10} class="mt-1 h-1.5" />
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>
