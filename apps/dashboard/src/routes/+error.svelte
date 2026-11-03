<script lang="ts">
  import { page } from '$app/state';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import { BRAND } from '$lib/utils/constants/brand';
  import { user } from '$lib/utils/store/user';
</script>

<svelte:head>
  <title>{page.status} · {BRAND.product}</title>
</svelte:head>

<main
  class="ui:bg-background ui:text-foreground flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
>
  <img src={BRAND.logo} alt={BRAND.name} class="w-72 max-w-full rounded-lg bg-white p-4" />
  <h1 class="text-5xl font-semibold">{page.status}</h1>
  <p class="ui:text-muted-foreground">{$t('mp_learning.internal')}</p>
  {#if $user.isLoggedIn}
    <Button href="/lms">{$t('course.not_permitted.button')}</Button>
  {:else}
    <Button href="/login">{$t('login.login')}</Button>
  {/if}
</main>
