<script lang="ts">
  import { tick } from 'svelte';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { ChatTextarea } from '@cio/ui/custom/chat-textarea';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SendIcon from '@lucide/svelte/icons/send-horizontal';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import XIcon from '@lucide/svelte/icons/x';

  import { t } from '$lib/utils/functions/translations';
  import { sidePanel } from '$features/side-panel';
  import { scenarioAssistant } from '$features/practice/api/scenario-assistant.svelte';
  import DifficultyIndicator from './difficulty-indicator.svelte';

  interface Props {
    onOpenDraft?: () => void;
  }

  let { onOpenDraft }: Props = $props();

  const SUGGESTION_KEYS = [
    'practice.assistant.suggestions.billing',
    'practice.assistant.suggestions.cancel',
    'practice.assistant.suggestions.telesale'
  ];
  const EDIT_SUGGESTION_KEYS = [
    'practice.assistant.suggestions.harder',
    'practice.assistant.suggestions.criteria',
    'practice.assistant.suggestions.opening'
  ];

  let input = $state('');
  let listElement = $state<HTMLDivElement | null>(null);

  const isEdit = $derived(scenarioAssistant.scenario !== null);
  const suggestionKeys = $derived(isEdit ? EDIT_SUGGESTION_KEYS : SUGGESTION_KEYS);
  const hasConversation = $derived(scenarioAssistant.messages.some((message) => !message.isNotice));
  const canStartNew = $derived(isEdit || scenarioAssistant.messages.length > 0);
  const showDraftCard = $derived(scenarioAssistant.hasDraft && !scenarioAssistant.isThinking);

  async function scrollToEnd() {
    await tick();
    listElement?.scrollTo({ top: listElement.scrollHeight, behavior: 'smooth' });
  }

  async function send(text: string) {
    if (!text.trim() || scenarioAssistant.isThinking) return;

    input = '';
    const sending = scenarioAssistant.send(text);
    void scrollToEnd();
    await sending;
    void scrollToEnd();
  }
</script>

<section class="flex h-full min-h-0 flex-col" data-testid="practice-assistant">
  <header class="flex items-center gap-2 border-b px-4 py-3">
    <SparklesIcon class="ui:text-primary size-4 shrink-0" />
    <div class="min-w-0 flex-1">
      <p class="text-sm font-semibold">{$t('practice.assistant.title')}</p>
      <p class="ui:text-muted-foreground truncate text-xs">{$t('practice.assistant.subtitle')}</p>
    </div>
    <IconButton
      size="icon-sm"
      disabled={!canStartNew || scenarioAssistant.isThinking}
      onclick={() => scenarioAssistant.startNew()}
      aria-label={$t('practice.assistant.new')}
      tooltip={$t('practice.assistant.new')}
    >
      <PlusIcon class="size-4" />
    </IconButton>
    <IconButton
      size="icon-sm"
      onclick={() => sidePanel.close()}
      aria-label={$t('side_panel.close_aria')}
      tooltip={$t('side_panel.close_aria')}
    >
      <XIcon class="size-4" />
    </IconButton>
  </header>

  <div class="ui:bg-muted/40 flex items-center gap-2 border-b px-4 py-2 text-xs">
    <span class="ui:text-muted-foreground shrink-0">
      {$t(isEdit ? 'practice.assistant.context_edit' : 'practice.assistant.context_new')}
    </span>
    {#if scenarioAssistant.scenario}
      <span class="min-w-0 truncate font-medium">{scenarioAssistant.scenario.title}</span>
    {/if}
  </div>

  <div bind:this={listElement} class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
    {#each scenarioAssistant.messages as message (message.id)}
      {#if message.isNotice}
        <p class="ui:bg-success-softui:text-success-foreground rounded-lg px-3 py-2 text-sm">
          {$t('practice.assistant.saved', { title: message.content })}
        </p>
      {:else}
        <div
          class="max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line {message.role === 'user'
            ? 'ui:bg-primary ui:text-primary-foreground self-end'
            : 'ui:bg-muted self-start'}"
        >
          {message.content}
        </div>
      {/if}
    {/each}

    {#if !hasConversation}
      <p class="ui:text-muted-foreground text-sm">
        {$t(isEdit ? 'practice.assistant.intro_edit' : 'practice.assistant.intro')}
      </p>
      <div class="flex flex-col gap-2">
        {#each suggestionKeys as key (key)}
          <Button
            variant="outline"
            size="sm"
            class="h-auto justify-start py-2 text-left whitespace-normal"
            disabled={scenarioAssistant.isThinking}
            onclick={() => send($t(key))}
          >
            {$t(key)}
          </Button>
        {/each}
      </div>
    {/if}

    {#if scenarioAssistant.isThinking}
      <p class="ui:text-muted-foreground animate-pulse text-sm">{$t('practice.assistant.thinking')}</p>
    {/if}

    {#if showDraftCard}
      <div class="ui:bg-background flex flex-col gap-2 rounded-xl border p-3" data-testid="practice-assistant-draft">
        <p class="ui:text-muted-foreground text-xs font-medium">{$t('practice.assistant.draft_label')}</p>
        <p class="text-sm font-semibold">{scenarioAssistant.draft.title || '—'}</p>
        {#if scenarioAssistant.draft.customerName}
          <p class="ui:text-muted-foreground text-xs">{scenarioAssistant.draft.customerName}</p>
        {/if}
        <div class="flex flex-wrap items-center gap-2">
          {#if scenarioAssistant.draft.topic}
            <Badge variant="secondary">{scenarioAssistant.draft.topic}</Badge>
          {/if}
          <DifficultyIndicator difficulty={scenarioAssistant.draft.difficulty} />
        </div>
        <Button size="sm" class="mt-1" onclick={() => onOpenDraft?.()} testId="practice-assistant-open-draft">
          {$t(isEdit ? 'practice.assistant.open_edit' : 'practice.assistant.open_new')}
        </Button>
      </div>
    {/if}
  </div>

  <div class="border-t p-3">
    <ChatTextarea
      bind:value={input}
      rows={2}
      placeholder={$t('practice.assistant.placeholder')}
      disabled={scenarioAssistant.isThinking}
      onSubmit={() => send(input)}
    >
      {#snippet actions()}
        <Button
          size="icon"
          variant="secondary"
          disabled={scenarioAssistant.isThinking || !input.trim()}
          onclick={() => send(input)}
          aria-label={$t('practice.assistant.send')}
        >
          <SendIcon class="size-4" />
        </Button>
      {/snippet}
    </ChatTextarea>
  </div>
</section>
