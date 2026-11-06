<script lang="ts">
  import { page } from '$app/state';
  import { PracticeCallPage } from '$features/practice/pages';
  import { t } from '$lib/utils/functions/translations';

  const scenarioId = $derived(page.params.scenarioId as string);
</script>

<svelte:head>
  <title>{$t('practice.page_title')} · MP Learning</title>
</svelte:head>

{#key scenarioId}
  <PracticeCallPage {scenarioId} />
{/key}
