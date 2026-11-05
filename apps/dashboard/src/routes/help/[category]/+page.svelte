<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { helpCategoryIcon } from '$features/help/category-icons';
  import { HELP_BASE_PATH } from '$features/help/help-markdown';

  let { data } = $props();

  const Icon = $derived(helpCategoryIcon(data.category.slug));
</script>

<nav aria-label="Đường dẫn" class="ui:text-muted-foreground mb-4 flex items-center gap-1 text-sm">
  <a href={HELP_BASE_PATH} class="ui:hover:text-foreground">Trợ giúp</a>
  <ChevronRightIcon size={14} />
  <span class="ui:text-foreground">{data.category.title}</span>
</nav>

<header class="mb-8 flex items-start gap-4">
  <span class="ui:bg-primary/10 ui:text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
    <Icon size={24} />
  </span>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{data.category.title}</h1>
    <p class="ui:text-muted-foreground mt-1">{data.category.description}</p>
  </div>
</header>

<ul class="ui:divide-border ui:border-border divide-y rounded-lg border">
  {#each data.category.articles as article (article.href)}
    <li>
      <a href={article.href} class="ui:hover:bg-muted/60 flex items-center gap-4 px-4 py-3.5">
        <span class="min-w-0 flex-1">
          <span class="block font-medium">{article.title}</span>
          {#if article.description}
            <span class="ui:text-muted-foreground mt-0.5 block text-sm">{article.description}</span>
          {/if}
        </span>
        <ChevronRightIcon size={16} class="ui:text-muted-foreground shrink-0" />
      </a>
    </li>
  {/each}
</ul>
