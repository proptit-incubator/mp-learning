<script lang="ts">
  import AppTopbar from './app-topbar.svelte';
  import AppBreadcrumbs from './app-breadcrumbs.svelte';
  import { SidePanelToggles } from '$features/side-panel';
</script>

<AppTopbar>
  {#snippet breadcrumbs()}
    <AppBreadcrumbs />
  {/snippet}
  {#snippet actions()}
    <SidePanelToggles />
  {/snippet}
</AppTopbar>
