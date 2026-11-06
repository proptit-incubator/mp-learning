<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { ScrollToTop } from '@cio/ui/custom/scroll-to-top';
  import { t } from '$lib/utils/functions/translations';
  import { currentOrg } from '$lib/utils/store/org';
  import { isOrgStudent } from '$lib/utils/store/app';
  import { appInitApi } from '$features/app/init.svelte';
  import { AppHeader } from '$features/ui';
  import { sidePanel, SidePanelRail } from '$features/side-panel';

  import { OrgSidebar } from '$features/ui/sidebar/org-sidebar';
  import SettingsSidebar from '$features/ui/sidebar/settings-sidebar.svelte';

  let { data, children } = $props();
  let sidebarProviderElement = $state<HTMLDivElement | null>(null);
  const isSettingsRoute = $derived(/\/settings(?:\/|$)/.test(page.url.pathname));
  const isCoursesList = $derived(/\/courses\/?$/.test(page.url.pathname));
  const contentWidth = $derived(/\/employees\/?$/.test(page.url.pathname) ? 'max-w-[1600px]' : 'max-w-6xl');

  function redirect(siteName: string | null) {
    if (!siteName) return;

    const newUrl = page.url.pathname.replace('*', siteName);
    goto(newUrl + page.url.search);
  }

  function handleSidePanelWidthPreview(width: number) {
    sidebarProviderElement?.style.setProperty('--side-panel-width', `${width}px`);
  }

  $effect(() => {
    data.orgName === '*' && redirect($currentOrg.siteName);
  });

  $effect(() => {
    // Students must not use the admin org dashboard on app.* — send them to LMS.
    // isStudentExperience is false on the app host in cloud mode even for students.
    if (appInitApi.isInitializedAndReady && $isOrgStudent) {
      goto(resolve('/lms', {}));
    }
  });
</script>

<Sidebar.Provider bind:ref={sidebarProviderElement} style={`--side-panel-width: ${sidePanel.width}px;`}>
  {#if isSettingsRoute}
    <SettingsSidebar />
  {:else}
    <OrgSidebar />
  {/if}

  <Sidebar.Inset class="min-w-0">
    {#if isSettingsRoute}
      <div class="flex h-10 items-center px-3 md:hidden">
        <Sidebar.Trigger testId="settings-sidebar-trigger-mobile" />
      </div>
    {:else}
      <AppHeader />
    {/if}

    <div
      class={isCoursesList
        ? 'flex w-full flex-1 flex-col'
        : `mx-auto flex w-full ${contentWidth} flex-1 flex-col gap-4 px-4 md:px-8`}
    >
      {#if data.orgName === '*'}
        <div class="grid auto-rows-min gap-4 md:grid-cols-3">
          <Skeleton class="aspect-video rounded-xl" />
          <Skeleton class="aspect-video rounded-xl" />
          <Skeleton class="aspect-video rounded-xl" />
        </div>
        <Skeleton class="h-[50vh] w-full rounded-xl" />
      {:else}
        {@render children?.()}
      {/if}
    </div>
  </Sidebar.Inset>
  <SidePanelRail onWidthPreview={handleSidePanelWidthPreview} />
  <ScrollToTop label={$t('common.scroll_to_top')} />
</Sidebar.Provider>
