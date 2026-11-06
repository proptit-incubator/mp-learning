<script lang="ts">
  import { tick, type Snippet } from 'svelte';
  import PlayIcon from '@lucide/svelte/icons/play';

  import { t } from '$lib/utils/functions/translations';
  import CustomerAvatar from './customer-avatar.svelte';
  import { formatCallDuration } from '$features/practice/utils/practice-utils';
  import type { PracticeChatMessage } from '$features/practice/utils/types';

  interface Props {
    customerName: string;
    messages: PracticeChatMessage[];
    agentDraft?: string;
    customerTyping?: boolean;
    class?: string;
    empty?: Snippet;
    activeMessageId?: string | null;
    onSelectMessage?: (message: PracticeChatMessage) => void;
  }

  let {
    customerName,
    messages,
    agentDraft = '',
    customerTyping = false,
    class: className = '',
    empty,
    activeMessageId = null,
    onSelectMessage
  }: Props = $props();

  let scroller = $state<HTMLDivElement | null>(null);

  const lastMessage = $derived(messages[messages.length - 1]);
  const showTypingDots = $derived(
    customerTyping && (!lastMessage || lastMessage.speaker !== 'customer' || !lastMessage.pending)
  );
  const scrollKey = $derived(
    `${messages.length}:${lastMessage?.text.length ?? 0}:${agentDraft.length}:${showTypingDots}`
  );

  $effect(() => {
    void scrollKey;

    void tick().then(() => {
      scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
    });
  });

  $effect(() => {
    if (!activeMessageId || !scroller) return;

    scroller
      .querySelector(`[data-message-id="${activeMessageId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  function startsSpeakerGroup(index: number): boolean {
    return index === 0 || messages[index - 1].speaker !== messages[index].speaker;
  }
</script>

{#snippet bubble(message: PracticeChatMessage, bubbleClass: string, hoverClass: string)}
  {#if onSelectMessage && message.offsetSeconds !== undefined}
    {@const playFrom = formatCallDuration(message.offsetSeconds)}
    <button
      type="button"
      class="{bubbleClass} {hoverClass} block cursor-pointer text-left transition-colors {message.id === activeMessageId
        ? 'ui:ring-primary ring-2 ring-offset-2'
        : ''}"
      title={$t('practice.review.play_from', { time: playFrom })}
      data-message-id={message.id}
      onclick={() => onSelectMessage(message)}
    >
      <span class="mb-0.5 flex items-center gap-1 text-[11px] tabular-nums opacity-70">
        <PlayIcon class="custom size-3" />
        {playFrom}
      </span>
      {message.text}
    </button>
  {:else}
    <p class={bubbleClass}>{message.text}</p>
  {/if}
{/snippet}

<div bind:this={scroller} class="ui:bg-muted/40 flex-1 overflow-y-auto px-4 py-5 md:px-6 {className}">
  {#if messages.length === 0 && !agentDraft && !customerTyping}
    {@render empty?.()}
  {/if}

  <div class="flex flex-col gap-2">
    {#each messages as message, index (message.id)}
      {#if message.speaker === 'customer'}
        <div class="flex max-w-[85%] items-end gap-2 self-start">
          <span class="w-7 shrink-0">
            {#if startsSpeakerGroup(index)}
              <CustomerAvatar name={customerName} size="sm" />
            {/if}
          </span>
          <div class="min-w-0">
            {#if startsSpeakerGroup(index)}
              <p class="ui:text-muted-foreground mb-1 text-[11px]">{customerName}</p>
            {/if}
            {@render bubble(
              message,
              'ui:bg-card rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm leading-relaxed shadow-xs',
              'ui:hover:bg-accent'
            )}
          </div>
        </div>
      {:else}
        <div class="flex max-w-[85%] flex-col items-end self-end">
          {#if startsSpeakerGroup(index)}
            <p class="ui:text-muted-foreground mb-1 text-[11px]">{$t('practice.call.you')}</p>
          {/if}
          {@render bubble(
            message,
            'ui:bg-primary ui:text-primary-foreground rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed',
            'ui:hover:bg-primary/90'
          )}
        </div>
      {/if}
    {/each}

    {#if showTypingDots}
      <div class="flex items-end gap-2 self-start">
        <span class="w-7 shrink-0"><CustomerAvatar name={customerName} size="sm" /></span>
        <span class="ui:bg-card flex gap-1 rounded-2xl rounded-bl-sm border px-3.5 py-3">
          {#each [0, 150, 300] as delay (delay)}
            <span
              class="ui:bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
              style="animation-delay: {delay}ms"
            ></span>
          {/each}
        </span>
      </div>
    {/if}

    {#if agentDraft}
      <p
        class="ui:border-primary/40 ui:text-muted-foreground max-w-[85%] self-end rounded-2xl rounded-br-sm border border-dashed px-3.5 py-2.5 text-sm italic"
      >
        {agentDraft}
      </p>
    {/if}
  </div>
</div>
