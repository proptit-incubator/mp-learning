<script lang="ts">
  import * as Page from '@cio/ui/base/page';
  import * as Alert from '@cio/ui/base/alert';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import ServerOffIcon from '@lucide/svelte/icons/server-off';
  import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
  import type { TAiPolicy } from '@cio/utils/validation/agent';
  import { UnsavedChanges } from '$features/ui';
  import AiModelSettings from '$features/settings/components/ai/ai-model-settings.svelte';
  import AiPolicyForm from '$features/settings/components/ai/ai-policy-form.svelte';
  import { aiTutorApi } from '$features/ai-tutor-settings/api/ai-tutor.svelte';
  import TeamLeaderboard from '$features/settings/components/ai/team-leaderboard.svelte';
  import UsageChart from '$features/settings/components/ai/usage-chart.svelte';
  import UsageSummaryCards from '$features/settings/components/ai/usage-summary-cards.svelte';
  import { aiSettingsApi } from '$features/settings/api/ai.svelte';
  import { currentOrg, isOrgAdmin } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';

  let fetchedOrgId = $state<string | null>(null);
  let draft = $state<TAiPolicy | null>(null);
  let learnerChatEnabled = $state<boolean | null>(null);

  const saved = $derived(aiSettingsApi.policy?.policy ?? null);
  const configured = $derived(aiSettingsApi.policy?.configured ?? true);
  const savedLearnerChatEnabled = $derived(aiTutorApi.orgSettings?.enabled ?? null);
  const policyChanged = $derived(Boolean(draft && saved && JSON.stringify(draft) !== JSON.stringify(saved)));
  const learnerChatChanged = $derived(learnerChatEnabled !== null && learnerChatEnabled !== savedLearnerChatEnabled);
  const hasUnsavedChanges = $derived(policyChanged || learnerChatChanged);
  const isSaving = $derived(aiSettingsApi.saving || aiTutorApi.saving);

  $effect(() => {
    const orgId = $currentOrg.id;
    if (!orgId || !$isOrgAdmin || orgId === fetchedOrgId) return;

    fetchedOrgId = orgId;
    void aiSettingsApi.fetchAll().then(() => {
      draft = saved ? { ...saved } : null;
    });
    void aiTutorApi.fetchOrgSettings().then(() => {
      learnerChatEnabled = aiTutorApi.orgSettings?.enabled ?? null;
    });
  });

  async function saveLearnerChat(): Promise<boolean> {
    if (!learnerChatChanged || learnerChatEnabled === null) return true;

    await aiTutorApi.updateOrgSettings({ enabled: learnerChatEnabled });

    return aiTutorApi.orgSettings?.enabled === learnerChatEnabled;
  }

  async function savePolicy(): Promise<boolean> {
    if (!draft || !policyChanged) return true;
    if (!(await aiSettingsApi.updatePolicy(draft)) || !saved) return false;

    const policy = saved;
    draft = { ...policy };
    currentOrg.update((org) => ({ ...org, settings: { ...org.settings, ai: policy } }));

    return true;
  }

  async function handleSave() {
    if (!(await savePolicy())) return;

    await saveLearnerChat();
  }

  function handleDiscard() {
    if (saved) draft = { ...saved };
    learnerChatEnabled = savedLearnerChatEnabled;
  }
</script>

<UnsavedChanges {hasUnsavedChanges} />

<Page.Header>
  <Page.HeaderContent>
    <Page.Eyebrow>{$t('mp_learning.settings.system')}</Page.Eyebrow>
    <Page.Title>{$t('settings.ai.title')}</Page.Title>
    <Page.Subtitle>{$t('settings.ai.subtitle')}</Page.Subtitle>
  </Page.HeaderContent>
</Page.Header>

<Page.Body>
  {#snippet child()}
    <div class="flex w-full flex-col gap-8">
      {#if $isOrgAdmin === false}
        <Alert.Root>
          <ShieldAlertIcon />
          <Alert.Title>{$t('settings.ai.admin_only.title')}</Alert.Title>
          <Alert.Description>{$t('settings.ai.admin_only.description')}</Alert.Description>
        </Alert.Root>
      {:else}
        {#if !configured}
          <Alert.Root>
            <ServerOffIcon />
            <Alert.Title>{$t('settings.ai.not_configured.title')}</Alert.Title>
            <Alert.Description>{$t('settings.ai.not_configured.description')}</Alert.Description>
          </Alert.Root>
        {/if}

        {#if draft}
          <AiPolicyForm bind:policy={draft} disabled={isSaving || !configured} />
          {#if aiSettingsApi.policy}
            <AiModelSettings
              bind:policy={draft}
              bind:learnerChatEnabled
              providers={aiSettingsApi.policy.providers}
              voices={aiSettingsApi.policy.voices}
              serverDefaultVoice={aiSettingsApi.policy.serverDefaultVoice}
              disabled={isSaving || !configured}
            />
          {/if}
        {:else}
          <div class="flex flex-col gap-3" aria-busy="true">
            <Skeleton class="h-6 w-48" />
            <Skeleton class="h-24 w-full" />
            <Skeleton class="h-40 w-full" />
          </div>
        {/if}

        <section class="flex flex-col gap-4" aria-labelledby="ai-usage-heading">
          <h2 id="ai-usage-heading" class="text-lg font-semibold tracking-tight">{$t('settings.ai.usage.heading')}</h2>
          <UsageSummaryCards usage={aiSettingsApi.usage} />
          <UsageChart usage={aiSettingsApi.usage} />
          <TeamLeaderboard leaderboard={aiSettingsApi.leaderboard} authorLimit={saved?.authorMonthlyLimit ?? null} />
        </section>
      {/if}
    </div>
  {/snippet}
</Page.Body>

<Page.SettingsActions
  hasChanges={hasUnsavedChanges}
  loading={isSaving}
  disabled={!draft || isSaving}
  statusLabel={$t('common.unsaved_changes.label')}
  discardLabel={$t('common.discard')}
  saveLabel={$t('common.save_changes')}
  onSave={handleSave}
  onDiscard={handleDiscard}
/>
