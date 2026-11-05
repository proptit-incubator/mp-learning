<script lang="ts">
  import { page } from '$app/state';
  import type { HelpNavCategory } from './content.server';
  import { helpCategoryIcon } from './category-icons';

  let { nav, currentCategory }: { nav: HelpNavCategory[]; currentCategory: string } = $props();

  const currentPath = $derived(page.url.pathname.replace(/\/$/, ''));
</script>

<nav aria-label="Danh mục trợ giúp" class="text-sm">
  <ul class="space-y-1">
    {#each nav as category (category.slug)}
      {@const Icon = helpCategoryIcon(category.slug)}
      <li>
        <details open={category.slug === currentCategory} class="group">
          <summary
            class="ui:hover:bg-muted flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 font-medium [&::-webkit-details-marker]:hidden"
          >
            <Icon size={16} class="ui:text-muted-foreground shrink-0" />
            <span class="flex-1">{category.title}</span>
          </summary>
          <ul class="ui:border-border mt-1 mb-2 ml-4 space-y-0.5 border-l pl-3">
            <li>
              <a
                href={category.href}
                class="block rounded px-2 py-1 {currentPath === category.href
                  ? 'ui:bg-primary/10 ui:text-primary font-medium'
                  : 'ui:text-muted-foreground ui:hover:text-foreground'}">Tổng quan</a
              >
            </li>
            {#each category.articles as article (article.href)}
              <li>
                <a
                  href={article.href}
                  aria-current={currentPath === article.href ? 'page' : undefined}
                  class="block rounded px-2 py-1 {currentPath === article.href
                    ? 'ui:bg-primary/10 ui:text-primary font-medium'
                    : 'ui:text-muted-foreground ui:hover:text-foreground'}">{article.title}</a
                >
              </li>
            {/each}
          </ul>
        </details>
      </li>
    {/each}
  </ul>
</nav>
