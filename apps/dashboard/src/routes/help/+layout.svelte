<script lang="ts">
  import { page } from '$app/state';
  import SearchIcon from '@lucide/svelte/icons/search';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import { BRAND } from '$lib/utils/constants/brand';
  import { HELP_BASE_PATH } from '$features/help/help-markdown';

  let { children } = $props();

  const isHome = $derived(page.url.pathname.replace(/\/$/, '') === HELP_BASE_PATH);
</script>

<div class="help-shell ui:bg-background ui:text-foreground min-h-screen">
  <header class="ui:border-border ui:bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
    <div class="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
      <a href={HELP_BASE_PATH} class="flex shrink-0 items-center gap-2">
        <img src={BRAND.mark} alt="" class="h-7 w-7 rounded" />
        <span class="text-sm font-semibold sm:text-base">Trung tâm trợ giúp</span>
      </a>

      {#if !isHome}
        <form
          action={HELP_BASE_PATH}
          method="GET"
          class="relative ml-auto hidden w-full max-w-sm md:block"
          role="search"
        >
          <SearchIcon
            size={16}
            class="ui:text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            name="q"
            placeholder="Tìm bài hướng dẫn…"
            aria-label="Tìm bài hướng dẫn"
            class="ui:border-input ui:bg-background h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </form>
      {/if}

      <a
        href="/"
        class="ui:text-muted-foreground ui:hover:text-foreground flex shrink-0 items-center gap-1.5 text-sm {isHome
          ? 'ml-auto'
          : 'ml-auto md:ml-0'}"
      >
        Mở {BRAND.product}
        <ExternalLinkIcon size={14} />
      </a>
    </div>
  </header>

  {@render children()}

  <footer class="ui:border-border ui:text-muted-foreground mt-16 border-t">
    <div class="mx-auto max-w-7xl px-4 py-6 text-sm">
      Trung tâm trợ giúp {BRAND.product} · Không tìm thấy câu trả lời? Xem
      <a href="{HELP_BASE_PATH}/support/contact-support" class="ui:text-primary underline underline-offset-4"
        >liên hệ hỗ trợ</a
      >.
    </div>
  </footer>
</div>
