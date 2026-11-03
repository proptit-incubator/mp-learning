<script lang="ts">
  import * as Page from '@cio/ui/base/page';
  import { t } from '$lib/utils/functions/translations';
  import { isEnterprisePlan } from '$lib/utils/store/org';
  import { UpgradeBanner } from '$features/ui';

  import AuthGeneral from '../components/auth-general.svelte';

  let authGeneralComponent: AuthGeneral | null = $state(null);
  let hasUnsavedChanges = $state(false);
  let isSaving = $state(false);

  async function handleSave() {
    isSaving = true;
    try {
      await authGeneralComponent?.handleSave();
    } finally {
      isSaving = false;
    }
  }

  function handleDiscard() {
    authGeneralComponent?.handleDiscard();
  }
</script>

<UpgradeBanner visible={!$isEnterprisePlan}>{$t('upgrade.enterprise_required')}</UpgradeBanner>

<AuthGeneral bind:this={authGeneralComponent} bind:hasUnsavedChanges />

<Page.SettingsActions
  hasChanges={hasUnsavedChanges}
  loading={isSaving}
  disabled={isSaving}
  statusLabel={$t('common.unsaved_changes.label')}
  discardLabel={$t('common.discard')}
  saveLabel={$t('common.save_changes')}
  onSave={handleSave}
  onDiscard={handleDiscard}
/>
