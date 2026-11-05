<script lang="ts">
  import { page } from '$app/state';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { BRAND } from '$lib/utils/constants/brand';
  import { helpCategoryIcon } from '$features/help/category-icons';
  import { searchHelp } from '$features/help/help-search';
  import { HELP_BASE_PATH } from '$features/help/help-markdown';
  import type { HelpSearchEntry } from '$features/help/content.server';

  let { data } = $props();

  const FEATURED_PER_CATEGORY = 4;

  let query = $state(page.url.searchParams.get('q') ?? '');

  const results = $derived(searchHelp<HelpSearchEntry>(data.searchIndex, query));
  const articleCount = $derived(data.helpNav.reduce((total, category) => total + category.articles.length, 0));
</script>

<section class="ui:border-border ui:bg-muted/40 border-b">
  <div class="mx-auto max-w-3xl px-4 py-12 text-center sm:py-16">
    <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Chúng tôi có thể giúp gì cho bạn?</h1>
    <p class="ui:text-muted-foreground mt-3">
      {articleCount} bài hướng dẫn sử dụng {BRAND.product} cho nhân viên, HR, L&amp;D và Admin.
    </p>

    <div class="relative mx-auto mt-6 max-w-xl" role="search">
      <SearchIcon
        size={18}
        class="ui:text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
      />
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="search"
        bind:value={query}
        autofocus
        placeholder="Ví dụ: giao khóa học, quên mật khẩu, chứng chỉ…"
        aria-label="Tìm bài hướng dẫn"
        class="ui:border-input ui:bg-background h-12 w-full rounded-lg border pr-4 pl-11 text-base shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
      />
    </div>
  </div>
</section>

<main class="mx-auto max-w-7xl px-4 py-10">
  {#if query.trim()}
    <h2 class="mb-4 text-lg font-semibold">
      {results.length
        ? `${results.length} kết quả cho “${query.trim()}”`
        : `Không tìm thấy bài nào cho “${query.trim()}”`}
    </h2>

    {#if results.length}
      <ul class="ui:divide-border ui:border-border divide-y rounded-lg border">
        {#each results as { entry, snippet } (entry.href)}
          <li>
            <a href={entry.href} class="ui:hover:bg-muted/60 block px-4 py-3">
              <span class="ui:text-muted-foreground text-xs">{entry.categoryTitle}</span>
              <span class="ui:text-primary block font-medium">{entry.title}</span>
              <span class="ui:text-muted-foreground mt-1 block text-sm">{snippet}</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="ui:text-muted-foreground">
        Thử dùng từ khóa ngắn hơn, hoặc xem
        <a href="{HELP_BASE_PATH}/support/faq" class="ui:text-primary underline underline-offset-4"
          >câu hỏi thường gặp</a
        >.
      </p>
    {/if}
  {:else}
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each data.helpNav as category (category.slug)}
        {@const Icon = helpCategoryIcon(category.slug)}
        <div class="ui:border-border ui:bg-card flex flex-col rounded-lg border p-5">
          <a href={category.href} class="group flex items-start gap-3">
            <span
              class="ui:bg-primary/10 ui:text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            >
              <Icon size={20} />
            </span>
            <span>
              <span class="block font-semibold group-hover:underline">{category.title}</span>
              <span class="ui:text-muted-foreground mt-0.5 block text-sm">{category.description}</span>
            </span>
          </a>

          <ul class="mt-4 space-y-1.5 text-sm">
            {#each category.articles.slice(0, FEATURED_PER_CATEGORY) as article (article.href)}
              <li>
                <a href={article.href} class="ui:text-foreground ui:hover:text-primary hover:underline"
                  >{article.title}</a
                >
              </li>
            {/each}
          </ul>

          {#if category.articles.length > FEATURED_PER_CATEGORY}
            <a href={category.href} class="ui:text-primary mt-auto flex items-center gap-1 pt-4 text-sm font-medium">
              Xem tất cả {category.articles.length} bài
              <ChevronRightIcon size={14} />
            </a>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>
