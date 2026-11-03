<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { AiPage } from '$features/settings/pages';
</script>

<svelte:head>
  <title>{$t('settings.ai.title')} · MP Learning</title>
</svelte:head>

<AiPage />
