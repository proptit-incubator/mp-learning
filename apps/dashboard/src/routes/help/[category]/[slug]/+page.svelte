<script lang="ts">
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { HELP_BASE_PATH } from '$features/help/help-markdown';

  let { data } = $props();

  const article = $derived(data.article);
</script>

<div class="flex gap-10">
  <article class="min-w-0 flex-1">
    <nav aria-label="Đường dẫn" class="ui:text-muted-foreground mb-4 flex flex-wrap items-center gap-1 text-sm">
      <a href={HELP_BASE_PATH} class="ui:hover:text-foreground">Trợ giúp</a>
      <ChevronRightIcon size={14} />
      <a href={data.categoryHref} class="ui:hover:text-foreground">{data.categoryTitle}</a>
    </nav>

    <header class="ui:border-border mb-8 border-b pb-6">
      <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">{article.title}</h1>
      {#if article.description}
        <p class="ui:text-muted-foreground mt-2 text-lg">{article.description}</p>
      {/if}
      {#if article.audience}
        <p class="mt-3 text-sm">
          <span class="ui:bg-muted rounded-full px-2.5 py-1">Dành cho: {article.audience}</span>
        </p>
      {/if}
    </header>

    <div class="help-body">
      {@html article.html}
    </div>

    {#if data.previous || data.next}
      <nav aria-label="Bài trước và bài sau" class="mt-12 grid gap-3 sm:grid-cols-2">
        {#if data.previous}
          <a href={data.previous.href} class="ui:border-border ui:hover:border-primary rounded-lg border p-4">
            <span class="ui:text-muted-foreground flex items-center gap-1 text-xs"
              ><ArrowLeftIcon size={12} /> Bài trước</span
            >
            <span class="mt-1 block font-medium">{data.previous.title}</span>
          </a>
        {:else}
          <span></span>
        {/if}
        {#if data.next}
          <a href={data.next.href} class="ui:border-border ui:hover:border-primary rounded-lg border p-4 text-right">
            <span class="ui:text-muted-foreground flex items-center justify-end gap-1 text-xs"
              >Bài sau <ArrowRightIcon size={12} /></span
            >
            <span class="mt-1 block font-medium">{data.next.title}</span>
          </a>
        {/if}
      </nav>
    {/if}
  </article>

  {#if article.toc.length > 1}
    <aside class="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 self-start overflow-y-auto xl:block">
      <p class="mb-2 text-xs font-semibold tracking-wide uppercase">Trong bài này</p>
      <ul class="ui:border-border space-y-1 border-l text-sm">
        {#each article.toc as entry (entry.id)}
          <li>
            <a
              href="#{entry.id}"
              class="ui:text-muted-foreground ui:hover:text-foreground block py-0.5 {entry.level === 3
                ? 'pl-6'
                : 'pl-3'}">{entry.text}</a
            >
          </li>
        {/each}
      </ul>
    </aside>
  {/if}
</div>

<style>
  .help-body {
    line-height: 1.75;
    color: var(--foreground);
  }

  .help-body :global(h2) {
    margin: 2.25rem 0 0.75rem;
    font-size: 1.375rem;
    font-weight: 600;
    scroll-margin-top: 5rem;
  }

  .help-body :global(h3) {
    margin: 1.75rem 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    scroll-margin-top: 5rem;
  }

  .help-body :global(h2:first-child),
  .help-body :global(h3:first-child) {
    margin-top: 0;
  }

  .help-body :global(.help-anchor) {
    float: left;
    margin-left: -1.1em;
    padding-right: 0.3em;
    color: var(--muted-foreground);
    text-decoration: none;
    opacity: 0;
  }

  .help-body :global(h2:hover .help-anchor),
  .help-body :global(h3:hover .help-anchor) {
    opacity: 1;
  }

  .help-body :global(p) {
    margin: 0.75rem 0;
  }

  .help-body :global(ul),
  .help-body :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  .help-body :global(ul) {
    list-style: disc;
  }

  .help-body :global(ol) {
    list-style: decimal;
  }

  .help-body :global(li) {
    margin: 0.3rem 0;
  }

  .help-body :global(li > ul),
  .help-body :global(li > ol) {
    margin: 0.25rem 0;
  }

  .help-body :global(a) {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .help-body :global(strong) {
    font-weight: 600;
  }

  .help-body :global(code) {
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    background: var(--muted);
    font-size: 0.875em;
  }

  .help-body :global(pre) {
    margin: 1rem 0;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 0.5rem;
    background: var(--muted);
    font-size: 0.85rem;
    line-height: 1.6;
  }

  .help-body :global(pre code) {
    padding: 0;
    background: transparent;
  }

  .help-body :global(blockquote) {
    margin: 1rem 0;
    padding-left: 1rem;
    border-left: 3px solid var(--border);
    color: var(--muted-foreground);
  }

  .help-body :global(.help-callout) {
    margin: 1.25rem 0;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-left-width: 4px;
    border-radius: 0.5rem;
    background: var(--muted);
  }

  .help-body :global(.help-callout p) {
    margin: 0.25rem 0;
  }

  .help-body :global(.help-callout-note) {
    border-left-color: var(--primary);
  }

  .help-body :global(.help-callout-tip) {
    border-left-color: #16a34a;
  }

  .help-body :global(.help-callout-warning) {
    border-left-color: #d97706;
  }

  .help-body :global(.help-table) {
    margin: 1rem 0;
    overflow-x: auto;
  }

  .help-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  .help-body :global(th),
  .help-body :global(td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    text-align: left;
    vertical-align: top;
  }

  .help-body :global(th) {
    background: var(--muted);
    font-weight: 600;
  }

  .help-body :global(hr) {
    margin: 2rem 0;
    border-color: var(--border);
  }
</style>
