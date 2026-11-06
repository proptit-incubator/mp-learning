<script lang="ts">
  import { goto } from '$app/navigation';
  import * as Alert from '@cio/ui/base/alert';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Empty } from '@cio/ui/custom/empty';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import DicesIcon from '@lucide/svelte/icons/dices';
  import PhoneCallIcon from '@lucide/svelte/icons/phone-call';

  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import {
    PracticeHistoryCard,
    PracticeStatsCard,
    PracticeStepsCard,
    ScenarioCard
  } from '$features/practice/components';
  import { pickRandom } from '$features/practice/utils/practice-utils';
  import type { PracticeDifficultyFilter } from '$features/practice/utils/types';

  const DIFFICULTY_FILTERS: Array<{ value: PracticeDifficultyFilter; labelKey: string }> = [
    { value: 'ALL', labelKey: 'practice.difficulty.all' },
    { value: 'EASY', labelKey: 'practice.difficulty.easy' },
    { value: 'MEDIUM', labelKey: 'practice.difficulty.medium' },
    { value: 'HARD', labelKey: 'practice.difficulty.hard' }
  ];

  let difficultyFilter = $state<PracticeDifficultyFilter>('ALL');
  let topicFilter = $state('');
  let loadedOrgId = '';

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === loadedOrgId) return;

    loadedOrgId = organizationId;
    void practiceApi.loadCatalog();
  });

  const scenarios = $derived(practiceApi.scenarios ?? []);
  const topics = $derived(
    scenarios
      .map((scenario) => scenario.topic)
      .filter((topic, index, allTopics) => topic && allTopics.indexOf(topic) === index)
  );
  const visibleScenarios = $derived(
    scenarios.filter(
      (scenario) =>
        (difficultyFilter === 'ALL' || scenario.difficulty === difficultyFilter) &&
        (!topicFilter || scenario.topic === topicFilter)
    )
  );
  const aiUnavailable = $derived(practiceApi.capabilities?.aiAvailable === false);

  function scenarioHref(scenarioId: string) {
    return `/lms/practice/${scenarioId}`;
  }

  function reviewHref(callId: string) {
    return `/lms/practice/calls/${callId}`;
  }

  function practiceRandom() {
    const scenario = pickRandom(visibleScenarios.length ? visibleScenarios : scenarios);
    if (scenario) void goto(scenarioHref(scenario.id));
  }
</script>

<div class="grid w-full gap-6 pt-2 pb-10 xl:grid-cols-[minmax(0,1fr)_360px]">
  <section class="ui:bg-card min-w-0 rounded-2xl border p-5 md:p-6">
    <h1 class="text-xl font-semibold">{$t('practice.catalog.title')}</h1>
    <p class="ui:text-muted-foreground mt-1 text-sm">{$t('practice.catalog.subtitle')}</p>

    {#if aiUnavailable}
      <Alert.Root variant="warning" class="mt-4">
        <Alert.Description>{$t('practice.not_configured')}</Alert.Description>
      </Alert.Root>
    {/if}

    {#if topics.length > 1}
      <div class="mt-4 flex flex-wrap gap-2">
        <Button
          size="xs"
          class="rounded-full"
          variant={topicFilter === '' ? 'default' : 'outline'}
          onclick={() => (topicFilter = '')}
        >
          {$t('practice.catalog.all_topics')}
        </Button>
        {#each topics as topic (topic)}
          <Button
            size="xs"
            class="rounded-full"
            variant={topicFilter === topic ? 'default' : 'outline'}
            onclick={() => (topicFilter = topic)}
          >
            {topic}
          </Button>
        {/each}
      </div>
    {/if}

    <Button
      class="mt-4 h-auto w-full justify-start gap-3 rounded-xl px-4 py-3 text-left whitespace-normal"
      disabled={scenarios.length === 0}
      onclick={practiceRandom}
    >
      <span class="flex size-9 items-center justify-center rounded-lg bg-white/15">
        <DicesIcon class="size-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold">{$t('practice.catalog.random_title')}</span>
        <span class="block text-xs opacity-80">{$t('practice.catalog.random_subtitle')}</span>
      </span>
      <ChevronRightIcon class="size-4" />
    </Button>

    <div class="mt-4 flex flex-wrap gap-2">
      {#each DIFFICULTY_FILTERS as filter (filter.value)}
        <Button
          size="xs"
          class="rounded-full"
          variant={difficultyFilter === filter.value ? 'default' : 'outline'}
          onclick={() => (difficultyFilter = filter.value)}
        >
          {$t(filter.labelKey)}
        </Button>
      {/each}
    </div>

    <div class="mt-4 flex flex-col gap-3">
      {#if practiceApi.scenarios === null}
        {#each [0, 1, 2] as index (index)}
          <Skeleton class="h-[76px] w-full rounded-xl" />
        {/each}
      {:else if scenarios.length === 0}
        <Empty
          title={$t('practice.catalog.empty_title')}
          description={$t('practice.catalog.empty_description')}
          icon={PhoneCallIcon}
        />
      {:else}
        {#each visibleScenarios as scenario (scenario.id)}
          <ScenarioCard {scenario} href={scenarioHref(scenario.id)} />
        {:else}
          <p class="ui:text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
            {$t('practice.catalog.empty_filtered')}
          </p>
        {/each}
      {/if}
    </div>
  </section>

  <aside class="flex min-w-0 flex-col gap-6">
    <PracticeStepsCard />
    <PracticeStatsCard stats={practiceApi.myStats} />
    <PracticeHistoryCard calls={practiceApi.history} {reviewHref} />
  </aside>
</div>
