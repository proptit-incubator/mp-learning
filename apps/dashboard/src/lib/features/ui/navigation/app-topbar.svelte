<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import Search from '$features/ui/search.svelte';

  interface Props {
    breadcrumbs: Snippet;
    actions?: Snippet;
    searchScope?: 'lms';
    hideSearch?: boolean;
  }

  let { breadcrumbs, actions, searchScope, hideSearch = false }: Props = $props();
</script>

<header
  class="ui:border-border ui:bg-background/85 sticky top-0 z-50 flex h-14 w-full shrink-0 items-center border-b backdrop-blur-md backdrop-saturate-150"
>
  <div class="flex w-full min-w-0 items-center gap-3 px-4 md:px-6">
    <Sidebar.Trigger testId="app-sidebar-trigger" class="ui:text-muted-foreground -ml-1" />
    <span class="ui:bg-border h-5 w-px shrink-0" aria-hidden="true"></span>

    <div class="min-w-0 flex-1">
      {@render breadcrumbs()}
    </div>

    {@render actions?.()}

    {#if !hideSearch}
      <Search scope={searchScope} />
    {/if}
  </div>
</header>
