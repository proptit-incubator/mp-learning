<script lang="ts">
  import { page } from '$app/state';
  import MenuIcon from '@lucide/svelte/icons/menu';
  import HelpSidebar from '$features/help/help-sidebar.svelte';

  let { data, children } = $props();

  const currentCategory = $derived(page.params.category ?? '');
</script>

<div class="mx-auto flex max-w-7xl gap-8 px-4 py-8">
  <aside class="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-64 shrink-0 overflow-y-auto pr-2 lg:block">
    <HelpSidebar nav={data.helpNav} {currentCategory} />
  </aside>

  <div class="min-w-0 flex-1">
    <details class="ui:border-border mb-6 rounded-lg border lg:hidden">
      <summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-medium">
        <MenuIcon size={16} />
        Danh mục bài viết
      </summary>
      <div class="ui:border-border border-t p-3">
        <HelpSidebar nav={data.helpNav} {currentCategory} />
      </div>
    </details>

    {@render children()}
  </div>
</div>
