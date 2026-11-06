<script lang="ts">
  import { PracticeCatalogPage } from '$features/practice/pages';
  import { t } from '$lib/utils/functions/translations';
</script>

<svelte:head>
  <title>{$t('practice.page_title')} · MP Learning</title>
</svelte:head>

<PracticeCatalogPage />
