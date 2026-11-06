<script lang="ts">
  import { Badge } from '@cio/ui/base/badge';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

  import CustomerAvatar from './customer-avatar.svelte';
  import DifficultyIndicator from './difficulty-indicator.svelte';
  import type { PracticeScenario } from '$features/practice/utils/types';

  interface Props {
    scenario: PracticeScenario;
    href: string;
  }

  let { scenario, href }: Props = $props();
</script>

<a
  {href}
  class="group ui:bg-card ui:hover:border-primary/40 ui:hover:bg-muted/40 flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors"
>
  <CustomerAvatar name={scenario.customerName} />
  <div class="min-w-0 flex-1">
    <p class="truncate text-sm font-semibold">{scenario.title}</p>
    <div class="mt-1 flex flex-wrap items-center gap-2">
      {#if scenario.topic}
        <Badge variant="secondary" class="h-5 px-1.5 text-[11px]">{scenario.topic}</Badge>
      {/if}
      <DifficultyIndicator difficulty={scenario.difficulty} />
    </div>
    {#if scenario.summary}
      <p class="ui:text-muted-foreground mt-1.5 line-clamp-2 text-xs">{scenario.summary}</p>
    {/if}
  </div>
  <ChevronRightIcon class="ui:text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
</a>
