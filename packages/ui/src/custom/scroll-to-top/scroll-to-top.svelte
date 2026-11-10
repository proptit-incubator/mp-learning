<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
  import { Button } from '../../base/button';
  import { cn } from '../../tools';
  import { SCROLL_TO_TOP_SHOW_RATIO, SCROLL_TO_TOP_HIDE_RATIO } from './constants';

  interface Props {
    label: string;
    target?: HTMLElement | null;
    clearance?: 'default' | 'mobile-nav' | 'ask-ai';
    class?: string;
  }

  let { label, target = null, clearance = 'default', class: className }: Props = $props();
  let visible = $state(false);
  let reducedMotion = $state(false);
  let animationFrame = 0;

  function updateVisibility() {
    const scrollElement = target ?? document.documentElement;
    const viewportHeight = target ? target.clientHeight : window.innerHeight;
    const scrollTop = target ? target.scrollTop : window.scrollY;
    if (scrollElement.scrollHeight <= viewportHeight) {
      visible = false;
      return;
    }

    const threshold = visible ? SCROLL_TO_TOP_HIDE_RATIO : SCROLL_TO_TOP_SHOW_RATIO;
    visible = scrollTop >= viewportHeight * threshold;
  }

  function scheduleUpdate() {
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(updateVisibility);
  }

  function scrollToTop() {
    const scrollTarget = target ?? window;
    const behavior = reducedMotion ? 'instant' : 'smooth';
    scrollTarget.scrollTo({ top: 0, behavior });
  }

  onMount(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function syncPreference() {
      reducedMotion = preference.matches;
    }
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => {
      preference.removeEventListener('change', syncPreference);
      cancelAnimationFrame(animationFrame);
    };
  });

  $effect(() => {
    const scrollTarget = target;
    const observedElement = scrollTarget ?? document.body;
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    const mutationObserver = new MutationObserver(scheduleUpdate);
    resizeObserver.observe(observedElement);
    mutationObserver.observe(observedElement, { childList: true, subtree: true });
    scrollTarget?.addEventListener('scroll', scheduleUpdate, { passive: true });
    untrack(updateVisibility);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      scrollTarget?.removeEventListener('scroll', scheduleUpdate);
      cancelAnimationFrame(animationFrame);
    };
  });
</script>

<svelte:window onscroll={scheduleUpdate} onresize={scheduleUpdate} />

{#if visible}
  <div
    transition:fly={{ y: reducedMotion ? 0 : 8, duration: reducedMotion ? 0 : 140 }}
    class={cn(
      'ui:fixed ui:right-6 ui:bottom-[max(1.5rem,env(safe-area-inset-bottom))] ui:z-30',
      clearance === 'mobile-nav' && 'ui:max-lg:bottom-28',
      clearance === 'ask-ai' && 'ui:max-md:bottom-28',
      className
    )}
  >
    <Button
      variant="secondary"
      size="icon-lg"
      class="ui:size-11 ui:rounded-full ui:border ui:border-border ui:bg-background ui:text-primary ui:shadow-lg ui:hover:bg-muted"
      aria-label={label}
      title={label}
      onclick={scrollToTop}
      testId="scroll-to-top"
    >
      <ArrowUpIcon class="ui:size-5" />
    </Button>
  </div>
{/if}
