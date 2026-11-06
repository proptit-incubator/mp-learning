<script lang="ts">
  import * as Table from '@cio/ui/base/table';
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import GaugeIcon from '@lucide/svelte/icons/gauge';
  import PhoneCallIcon from '@lucide/svelte/icons/phone-call';
  import UsersIcon from '@lucide/svelte/icons/users';
  import { PRACTICE_STATS_RANGES, type TPracticeStatsRange } from '@cio/utils/validation/practice';

  import { KpiCard } from '$features/analytics';
  import SectionCard from '$features/ui/section-card.svelte';
  import { currentOrg } from '$lib/utils/store/org';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import {
    barHeightPercent,
    scoreBucketLabel,
    scoreToneBgClass,
    scoreToneClass,
    toPracticeMinutes,
    weakestCriteria
  } from '$features/practice/utils/practice-utils';

  const SCORE_LEGEND = [
    { key: 'low', score: 0, labelKey: 'practice.stats.legend_low' },
    { key: 'mid', score: 50, labelKey: 'practice.stats.legend_mid' },
    { key: 'high', score: 80, labelKey: 'practice.stats.legend_high' }
  ];

  let range = $state<TPracticeStatsRange>('30d');
  let loadedKey = '';

  $effect(() => {
    const organizationId = $currentOrg.id;
    const loadKey = `${organizationId}:${range}`;
    if (!organizationId || loadKey === loadedKey) return;

    loadedKey = loadKey;
    void practiceApi.loadOrgStats(range);
  });

  const stats = $derived(practiceApi.orgStats);
  const totals = $derived(stats?.totals);
  const activityMaximum = $derived(Math.max(0, ...(stats?.activity ?? []).map((day) => day.calls)));
  const bucketMaximum = $derived(Math.max(0, ...(stats?.scoreBuckets ?? [])));
  const labelInterval = $derived(Math.max(1, Math.ceil((stats?.activity.length ?? 0) / 6)));
  const criteria = $derived(weakestCriteria(stats?.criteria ?? [], stats?.criteria.length ?? 0));

  function formatDay(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), { day: '2-digit', month: '2-digit' }).format(
      new Date(`${value}T12:00:00+07:00`)
    );
  }

  function formatScore(score: number | null | undefined) {
    return score === null || score === undefined ? '—' : String(score);
  }
</script>

<div class="flex flex-col gap-4" data-testid="practice-stats-overview">
  <div class="flex flex-wrap items-center justify-between gap-2">
    <p class="ui:text-muted-foreground text-sm">{$t('practice.stats.subtitle')}</p>
    <div class="flex flex-wrap gap-1.5" role="group" aria-label={$t('practice.stats.range_label')}>
      {#each PRACTICE_STATS_RANGES as option (option)}
        <Button
          size="xs"
          class="rounded-full"
          variant={range === option ? 'default' : 'outline'}
          aria-pressed={range === option}
          onclick={() => (range = option)}
        >
          {$t(`practice.stats.range.${option}`)}
        </Button>
      {/each}
    </div>
  </div>

  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <KpiCard
      title={$t('practice.stats.calls')}
      value={(totals?.callCount ?? 0).toLocaleString()}
      description={$t('practice.stats.reviewed_count', { count: totals?.reviewedCount ?? 0 })}
      icon={PhoneCallIcon}
      loading={!stats}
    />
    <KpiCard
      title={$t('practice.stats.learners')}
      value={(totals?.learnerCount ?? 0).toLocaleString()}
      icon={UsersIcon}
      accent="warning"
      loading={!stats}
    />
    <KpiCard
      title={$t('practice.stats.average')}
      value={formatScore(totals?.averageScore)}
      description={$t('practice.stats.best_value', { score: formatScore(totals?.bestScore) })}
      icon={GaugeIcon}
      accent="success"
      loading={!stats}
    />
    <KpiCard
      title={$t('practice.stats.minutes')}
      value={toPracticeMinutes(totals?.totalSeconds ?? 0).toLocaleString()}
      icon={ClockIcon}
      loading={!stats}
    />
  </div>

  <div class="grid gap-4 xl:grid-cols-2">
    <SectionCard title={$t('practice.stats.activity_title')} description={$t('practice.stats.activity_description')}>
      {#if !stats}
        <Skeleton class="h-44 w-full rounded-lg" />
      {:else if activityMaximum === 0}
        <p class="ui:text-muted-foreground flex h-44 items-center justify-center text-sm">
          {$t('practice.stats.no_calls')}
        </p>
      {:else}
        <div
          class="flex h-44 items-end"
          style:gap={stats.activity.length > 31 ? '1px' : '3px'}
          role="img"
          aria-label={$t('practice.stats.activity_title')}
        >
          {#each stats.activity as day, index (day.date)}
            <div class="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <div
                class="flex h-36 w-full items-end justify-center"
                title={$t('practice.stats.activity_tooltip', {
                  date: formatDay(day.date),
                  count: day.calls,
                  score: formatScore(day.averageScore)
                })}
              >
                <span
                  class="ui:bg-primary ui:group-hover:bg-primary/80 w-full max-w-4 rounded-t-sm"
                  style:height={`${barHeightPercent(day.calls, activityMaximum)}%`}
                ></span>
              </div>
              <span class="ui:text-muted-foreground h-4 text-[10px] whitespace-nowrap tabular-nums">
                {index % labelInterval === 0 || index === stats.activity.length - 1 ? formatDay(day.date) : ''}
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </SectionCard>

    <SectionCard
      title={$t('practice.stats.distribution_title')}
      description={$t('practice.stats.distribution_description')}
    >
      {#if !stats}
        <Skeleton class="h-44 w-full rounded-lg" />
      {:else if bucketMaximum === 0}
        <p class="ui:text-muted-foreground flex h-44 items-center justify-center text-sm">
          {$t('practice.stats.no_scores')}
        </p>
      {:else}
        <div class="ui:text-muted-foreground mb-2 flex flex-wrap gap-4 text-xs">
          {#each SCORE_LEGEND as item (item.key)}
            <span class="inline-flex items-center gap-1.5">
              <span class="size-2 rounded-sm {scoreToneBgClass(item.score)}"></span>{$t(item.labelKey)}
            </span>
          {/each}
        </div>
        <div class="flex h-40 items-end gap-1" role="img" aria-label={$t('practice.stats.distribution_title')}>
          {#each stats.scoreBuckets as count, bucket (bucket)}
            <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span class="ui:text-muted-foreground text-[10px] tabular-nums">{count || ''}</span>
              <div
                class="flex h-28 w-full items-end justify-center"
                title={$t('practice.stats.distribution_tooltip', { range: scoreBucketLabel(bucket), count })}
              >
                <span
                  class="w-full max-w-8 rounded-t-sm {scoreToneBgClass(bucket * 10)}"
                  style:height={`${barHeightPercent(count, bucketMaximum)}%`}
                ></span>
              </div>
              <span class="ui:text-muted-foreground h-4 text-[10px] tabular-nums">{bucket * 10}</span>
            </div>
          {/each}
        </div>
      {/if}
    </SectionCard>
  </div>

  <SectionCard title={$t('practice.stats.criteria_title')} description={$t('practice.stats.criteria_description')}>
    {#if !stats}
      <Skeleton class="h-32 w-full rounded-lg" />
    {:else if criteria.length === 0}
      <p class="ui:text-muted-foreground py-6 text-center text-sm">{$t('practice.stats.no_scores')}</p>
    {:else}
      <ul class="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {#each criteria as criterion (criterion.name)}
          <li>
            <div class="flex items-center justify-between gap-2 text-sm">
              <span class="truncate">{criterion.name}</span>
              <span class="shrink-0 tabular-nums">
                <span class="font-medium {scoreToneClass(criterion.averageScore * 10)}"
                  >{criterion.averageScore}/10</span
                >
                <span class="ui:text-muted-foreground text-xs">
                  · {$t('practice.stats.graded_count', { count: criterion.count })}</span
                >
              </span>
            </div>
            <Progress value={criterion.averageScore * 10} class="mt-1.5 h-1.5" />
          </li>
        {/each}
      </ul>
    {/if}
  </SectionCard>

  <SectionCard title={$t('practice.stats.learners_title')} description={$t('practice.stats.learners_description')}>
    {#if !stats}
      <Skeleton class="h-40 w-full rounded-lg" />
    {:else if stats.learners.length === 0}
      <p class="ui:text-muted-foreground py-6 text-center text-sm">{$t('practice.stats.no_calls')}</p>
    {:else}
      <div class="overflow-x-auto rounded-md border">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>{$t('practice.admin.table.employee')}</Table.Head>
              <Table.Head class="text-right">{$t('practice.stats.calls')}</Table.Head>
              <Table.Head class="text-right">{$t('practice.stats.average')}</Table.Head>
              <Table.Head class="text-right">{$t('practice.stats.best')}</Table.Head>
              <Table.Head class="text-right">{$t('practice.stats.minutes')}</Table.Head>
              <Table.Head>{$t('practice.stats.last_call')}</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each stats.learners as learner (learner.profileId)}
              <Table.Row>
                <Table.Cell>
                  <p class="text-sm font-medium">{learner.fullname}</p>
                  <p class="ui:text-muted-foreground text-xs">{learner.email ?? ''}</p>
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">{learner.callCount}</Table.Cell>
                <Table.Cell class="text-right font-semibold tabular-nums {scoreToneClass(learner.averageScore)}">
                  {formatScore(learner.averageScore)}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums {scoreToneClass(learner.bestScore)}">
                  {formatScore(learner.bestScore)}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">{toPracticeMinutes(learner.totalSeconds)}</Table.Cell>
                <Table.Cell class="ui:text-muted-foreground text-sm">{calDateDiff(learner.lastCallAt)}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </div>
    {/if}
  </SectionCard>
</div>
