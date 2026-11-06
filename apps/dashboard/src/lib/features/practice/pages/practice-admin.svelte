<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import * as Page from '@cio/ui/base/page';
  import * as Table from '@cio/ui/base/table';
  import * as UnderlineTabs from '@cio/ui/custom/underline-tabs';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Switch } from '@cio/ui/base/switch';
  import { Empty } from '@cio/ui/custom/empty';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
  import PhoneCallIcon from '@lucide/svelte/icons/phone-call';
  import { isMobileStore } from '@cio/ui/hooks/is-mobile.svelte';

  import { DeleteModal } from '$features/ui';
  import { currentOrg } from '$lib/utils/store/org';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import { scenarioAssistant } from '$features/practice/api/scenario-assistant.svelte';
  import { sidePanel } from '$features/side-panel';
  import {
    PRACTICE_ASSISTANT_PANEL_ID,
    practiceAssistantPanelDefinition
  } from '$features/practice/utils/assistant-panel';
  import {
    CustomerAvatar,
    DifficultyIndicator,
    PracticeStatsOverview,
    ScenarioFormDialog
  } from '$features/practice/components';
  import { formatCallDuration, scoreToneClass } from '$features/practice/utils/practice-utils';
  import type { ManagedPracticeScenario, PracticeScenarioDraft } from '$features/practice/utils/types';

  let activeTab = $state('scenarios');
  let isFormOpen = $state(false);
  let formKey = $state(0);
  let editingScenario = $state<ManagedPracticeScenario | null>(null);
  let formDraft = $state<PracticeScenarioDraft | null>(null);
  let deletingScenario = $state<ManagedPracticeScenario | null>(null);
  let isDeleteOpen = $state(false);
  let loadedOrgId = '';

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === loadedOrgId) return;

    loadedOrgId = organizationId;
    void practiceApi.listManagedScenarios();
    void practiceApi.listResults();
    if (!practiceApi.capabilities) void practiceApi.loadCapabilities();
  });

  sidePanel.register(practiceAssistantPanelDefinition);

  onMount(() => {
    if (!isMobileStore.current) openAssistant();
  });

  onDestroy(() => {
    sidePanel.unregister(PRACTICE_ASSISTANT_PANEL_ID);
  });

  function openAssistant() {
    sidePanel.open(PRACTICE_ASSISTANT_PANEL_ID, { onOpenDraft: openAssistantDraft });
  }

  function editWithAssistant(scenario: ManagedPracticeScenario) {
    scenarioAssistant.editScenario(scenario);
    openAssistant();
  }

  function openForm(scenario: ManagedPracticeScenario | null, draft: PracticeScenarioDraft | null = null) {
    practiceApi.resetErrors();
    editingScenario = scenario;
    formDraft = draft;
    formKey += 1;
    isFormOpen = true;
  }

  function openAssistantDraft() {
    const draftCopy = { ...scenarioAssistant.draft };
    openForm(scenarioAssistant.scenario, draftCopy);
  }

  function handleFormSaved(title: string) {
    if (formDraft) scenarioAssistant.finish(title);
  }

  function askDelete(scenario: ManagedPracticeScenario) {
    deletingScenario = scenario;
    isDeleteOpen = true;
  }

  async function confirmDelete() {
    if (!deletingScenario) return;

    const deleted = await practiceApi.deleteScenario(deletingScenario.id);
    if (!deleted) return;

    isDeleteOpen = false;
    deletingScenario = null;
  }

  function setPublished(scenario: ManagedPracticeScenario, isPublished: boolean) {
    const successKey = isPublished ? 'practice.admin.snackbar.published' : 'practice.admin.snackbar.unpublished';
    void practiceApi.updateScenario(scenario.id, { isPublished }, successKey);
  }
</script>

<svelte:head>
  <title>{$t('practice.admin.title')}</title>
</svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Title>{$t('practice.admin.title')}</Page.Title>
      <Page.Subtitle>{$t('practice.admin.subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
    <Page.Action>
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          loading={practiceApi.isSaving}
          onclick={() => practiceApi.addSampleScenarios()}
          testId="practice-scenario-add-samples"
        >
          {$t('practice.admin.add_samples')}
        </Button>
        <Button onclick={() => openForm(null)} testId="practice-scenario-create">{$t('practice.admin.add')}</Button>
      </div>
    </Page.Action>
  </Page.Header>

  <Page.Body>
    {#snippet child()}
      <UnderlineTabs.Root bind:value={activeTab} class="min-w-0">
        <UnderlineTabs.List>
          <UnderlineTabs.Trigger value="scenarios">{$t('practice.admin.tabs.scenarios')}</UnderlineTabs.Trigger>
          <UnderlineTabs.Trigger value="results">{$t('practice.admin.tabs.results')}</UnderlineTabs.Trigger>
          <UnderlineTabs.Trigger value="stats">{$t('practice.admin.tabs.stats')}</UnderlineTabs.Trigger>
        </UnderlineTabs.List>

        <UnderlineTabs.Content value="scenarios" class="mt-4">
          {#if practiceApi.managedScenarios === null}
            <Skeleton class="h-48 w-full rounded-md" />
          {:else if practiceApi.managedScenarios.length === 0}
            <Empty
              title={$t('practice.admin.empty.title')}
              description={$t('practice.admin.empty.description')}
              icon={PhoneCallIcon}
              variant="page"
            >
              <div class="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  loading={practiceApi.isSaving}
                  onclick={() => practiceApi.addSampleScenarios()}
                >
                  {$t('practice.admin.add_samples')}
                </Button>
                <Button onclick={() => openForm(null)}>{$t('practice.admin.add')}</Button>
              </div>
            </Empty>
          {:else}
            <div class="rounded-md border">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>{$t('practice.admin.table.scenario')}</Table.Head>
                    <Table.Head>{$t('practice.admin.table.topic')}</Table.Head>
                    <Table.Head>{$t('practice.admin.table.difficulty')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.calls')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.average')}</Table.Head>
                    <Table.Head>{$t('practice.admin.table.published')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.actions')}</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each practiceApi.managedScenarios as scenario (scenario.id)}
                    <Table.Row>
                      <Table.Cell>
                        <Button
                          variant="ghost"
                          class="h-auto justify-start gap-3 px-0 py-0 text-left hover:bg-transparent"
                          onclick={() => openForm(scenario)}
                        >
                          <CustomerAvatar name={scenario.customerName} size="sm" />
                          <span class="min-w-0">
                            <span class="block max-w-[320px] truncate text-sm font-medium">{scenario.title}</span>
                            <span class="ui:text-muted-foreground block max-w-[320px] truncate text-xs font-normal">
                              {scenario.customerName}
                            </span>
                          </span>
                        </Button>
                      </Table.Cell>
                      <Table.Cell>
                        {#if scenario.topic}
                          <Badge variant="secondary">{scenario.topic}</Badge>
                        {/if}
                      </Table.Cell>
                      <Table.Cell><DifficultyIndicator difficulty={scenario.difficulty} /></Table.Cell>
                      <Table.Cell class="text-right tabular-nums">{scenario.callCount}</Table.Cell>
                      <Table.Cell class="text-right font-medium tabular-nums {scoreToneClass(scenario.averageScore)}">
                        {scenario.averageScore ?? '—'}
                      </Table.Cell>
                      <Table.Cell>
                        <Switch
                          checked={scenario.isPublished}
                          onCheckedChange={(checked) => setPublished(scenario, checked)}
                          aria-label={$t('practice.admin.table.published')}
                        />
                      </Table.Cell>
                      <Table.Cell class="text-right">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger>
                            {#snippet child({ props })}
                              <IconButton {...props} size="icon-sm" aria-label={$t('practice.admin.actions.menu')}>
                                <EllipsisVerticalIcon class="size-4" />
                              </IconButton>
                            {/snippet}
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Content align="end">
                            <DropdownMenu.Item onclick={() => openForm(scenario)}>
                              {$t('practice.admin.actions.edit')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onclick={() => editWithAssistant(scenario)}>
                              {$t('practice.admin.actions.edit_with_ai')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Item onclick={() => goto(`/lms/practice/${scenario.id}`)}>
                              {$t('practice.admin.actions.try')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item variant="destructive" onclick={() => askDelete(scenario)}>
                              {$t('practice.admin.actions.delete')}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Root>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          {/if}
        </UnderlineTabs.Content>

        <UnderlineTabs.Content value="results" class="mt-4">
          {#if practiceApi.results === null}
            <Skeleton class="h-48 w-full rounded-md" />
          {:else if practiceApi.results.length === 0}
            <p class="ui:text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm">
              {$t('practice.admin.results_empty')}
            </p>
          {:else}
            <div class="rounded-md border">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>{$t('practice.admin.table.employee')}</Table.Head>
                    <Table.Head>{$t('practice.admin.table.scenario')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.score')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.duration')}</Table.Head>
                    <Table.Head>{$t('practice.admin.table.date')}</Table.Head>
                    <Table.Head class="text-right">{$t('practice.admin.table.view')}</Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {#each practiceApi.results as result (result.id)}
                    <Table.Row>
                      <Table.Cell>
                        <p class="text-sm font-medium">{result.learnerName}</p>
                        <p class="ui:text-muted-foreground text-xs">{result.learnerEmail ?? ''}</p>
                      </Table.Cell>
                      <Table.Cell>
                        <p class="max-w-[280px] truncate text-sm">{result.scenarioTitle}</p>
                        <DifficultyIndicator difficulty={result.difficulty} />
                      </Table.Cell>
                      <Table.Cell
                        class="text-right font-semibold tabular-nums {scoreToneClass(
                          result.reviewScore ?? result.score
                        )}"
                      >
                        {#if result.status === 'ACTIVE'}
                          <span class="ui:text-muted-foreground text-xs font-normal">
                            {$t('practice.history.in_progress')}
                          </span>
                        {:else}
                          {result.reviewScore ?? result.score ?? '—'}
                          {#if result.reviewedAt}
                            <span class="ui:text-muted-foreground block text-xs font-normal">
                              {$t('practice.admin.table.reviewed')}
                            </span>
                          {/if}
                        {/if}
                      </Table.Cell>
                      <Table.Cell class="text-right tabular-nums">
                        {result.durationSeconds === null ? '—' : formatCallDuration(result.durationSeconds)}
                      </Table.Cell>
                      <Table.Cell class="ui:text-muted-foreground text-sm">{calDateDiff(result.startedAt)}</Table.Cell>
                      <Table.Cell class="text-right">
                        <Button size="xs" variant="outline" href={`/practice/calls/${result.id}`}>
                          {$t('practice.admin.table.view')}
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  {/each}
                </Table.Body>
              </Table.Root>
            </div>
          {/if}
        </UnderlineTabs.Content>

        <UnderlineTabs.Content value="stats" class="mt-4">
          {#if activeTab === 'stats'}
            <PracticeStatsOverview />
          {/if}
        </UnderlineTabs.Content>
      </UnderlineTabs.Root>
    {/snippet}
  </Page.Body>
</Page.Root>

{#if isFormOpen}
  {#key formKey}
    <ScenarioFormDialog
      bind:open={isFormOpen}
      scenario={editingScenario}
      initialDraft={formDraft}
      onSaved={handleFormSaved}
      voices={practiceApi.capabilities?.voices ?? []}
      defaultVoice={practiceApi.capabilities?.defaultVoice ?? ''}
    />
  {/key}
{/if}

<DeleteModal bind:open={isDeleteOpen} isLoading={practiceApi.isSaving} onDelete={confirmDelete} />
