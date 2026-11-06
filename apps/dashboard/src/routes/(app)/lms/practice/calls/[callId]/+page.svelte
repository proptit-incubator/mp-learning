<script lang="ts">
  import { page } from '$app/state';
  import { PracticeReviewPage } from '$features/practice/pages';
  import { t } from '$lib/utils/functions/translations';

  const callId = $derived(page.params.callId as string);

  function retryHref(scenarioId: string) {
    return `/lms/practice/${scenarioId}`;
  }
</script>

<svelte:head>
  <title>{$t('practice.review.title')} · MP Learning</title>
</svelte:head>

<PracticeReviewPage {callId} backHref="/lms/practice" backLabel={$t('practice.call.back_to_catalog')} {retryHref} />
