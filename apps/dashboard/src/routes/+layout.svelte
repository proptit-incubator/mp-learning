<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  import { Snackbar } from '$features/ui';
  import { appInitApi } from '$features/app/init.svelte';
  import { resolveAppOrgParams } from '$features/app/resolve-app-org-params';
  import { globalStore } from '$lib/utils/store/app';
  import { currentOrg, mergeAccountOrgFromServer } from '$lib/utils/store/org';
  import { get } from 'svelte/store';
  import { user } from '$lib/utils/store/user';
  import { setTheme } from '$lib/utils/functions/theme';
  import { activateLocale, ensureTranslations, t } from '$lib/utils/functions/translations';
  import { translateUiLabels } from '$lib/utils/functions/ui-labels';
  import { setUiLabels } from '@cio/ui/tools';
  import { authClient } from '$lib/utils/services/auth/client';
  import merge from 'lodash/merge';
  import { MetaTags } from 'svelte-meta-tags';
  import AppModeWatcher from '$features/app/app-mode-watcher.svelte';
  import AppVersionNotifier from '$features/app/app-version-notifier.svelte';
  import OrgSiteFavicon from '$features/app/org-site-favicon.svelte';

  import '../app.css';

  import { setUploadLimitsContext } from '$lib/utils/config/upload-limits-context';

  let { data, children } = $props();

  setUploadLimitsContext(data.uploadLimits);

  const metaTags = $derived(merge(data.baseMetaTags, page.data.pageMetaTags));

  $effect(() => {
    setUiLabels(translateUiLabels($t));
  });

  onMount(() => {
    if (data?.locals?.user) {
      user.set({
        ...$user,
        isLoggedIn: true,
        currentSession: data.locals.user
      });
    }
  });

  $effect(() => {
    let isCurrent = true;
    const isOrgSiteRoute = data.isOrgSite && page.url.pathname.length > 0;

    if (!data.isOrgSite || !data.org) {
      $globalStore.isOrgSite = false;
      $globalStore.orgSiteName = '';
      return () => {
        isCurrent = false;
      };
    }

    const enforcedLocale = data.org.settings?.language?.enforced ? data.org.settings.language.locale : undefined;
    if (isOrgSiteRoute && enforcedLocale) {
      void ensureTranslations(enforcedLocale, () => isCurrent).then(() => {
        if (isCurrent) activateLocale(enforcedLocale);
      });
    }

    $globalStore.orgSiteName = data.orgSiteName || '';
    $globalStore.isOrgSite = true;

    const existingOrg = get(currentOrg);
    const shouldSetPublicOrg =
      !existingOrg.id || existingOrg.siteName !== data.org.siteName || existingOrg.roleId === 0;

    if (shouldSetPublicOrg) {
      currentOrg.set(mergeAccountOrgFromServer(data.org));
    }

    setTheme(data.org.theme || 'blue');

    return () => {
      isCurrent = false;
    };
  });

  const session = authClient.useSession();
  const isSessionReady = $derived(!$session.isPending && !$session.isRefetching && $session.data);
  const appOrgParams = $derived(resolveAppOrgParams(data, page.url.pathname, page.params.slug));

  /*
    Auth + org context for the whole dashboard.

    setupApp runs once per session to load /account. After that, org context can
    still change when a logged-in user navigates to a different tenant subdomain
    or opens another /org/[slug] on the app host — without another setupApp run.
    syncOrgContext re-pins currentOrg from the URL + cached account data.
  */
  $effect(() => {
    if (!isSessionReady || appInitApi.loading) {
      return;
    }

    if (!appInitApi.isInitializedAndReady) {
      appInitApi.setupApp($session.data as App.Locals, appOrgParams);
      return;
    }

    void appInitApi.syncOrgContext(appOrgParams);
  });
</script>

{#if data.isOrgSite}
  <OrgSiteFavicon org={data.org} />
{/if}

<svelte:head>
  {#if !data.isOrgSite}
    <link rel="icon" type="image/png" href="/brand/mp-transformation.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/brand/mp-transformation.png" />
  {/if}
</svelte:head>

<div>
  <AppModeWatcher />

  <MetaTags {...metaTags} />

  <Snackbar />
  <AppVersionNotifier />

  {@render children?.()}
</div>

<style>
  :global(:root) {
    --main-primary-color: rgba(29, 78, 216, 1);
    --border-color: #eaecef;
  }

  :global(.dark svg.dark) {
    fill: #fff;
  }

  :global(.border-c) {
    border: 1px solid var(--border-color);
  }

  :global(.border-bottom-c) {
    border-bottom: 1px solid var(--border-color);
  }

  :global(.cards-container) {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(1, minmax(0, 1fr));
    gap: 1rem;
  }

  @media screen and (min-width: 640px) {
    :global(.cards-container) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media screen and (min-width: 1280px) {
    :global(.cards-container) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
</style>
