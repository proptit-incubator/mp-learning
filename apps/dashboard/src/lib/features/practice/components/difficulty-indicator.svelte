<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import {
    DIFFICULTY_LABEL_KEYS,
    DIFFICULTY_LEVELS,
    DIFFICULTY_TONE_CLASSES,
    toDifficulty
  } from '$features/practice/utils/practice-utils';

  interface Props {
    difficulty: string;
    class?: string;
  }

  let { difficulty, class: className = '' }: Props = $props();

  const level = $derived(toDifficulty(difficulty));
  const filledDots = $derived(DIFFICULTY_LEVELS[level]);
</script>

<span class="inline-flex items-center gap-1 text-xs font-medium {DIFFICULTY_TONE_CLASSES[level]} {className}">
  <span class="inline-flex gap-0.5" aria-hidden="true">
    {#each [1, 2, 3] as dot (dot)}
      <span class="size-1.5 rounded-full {dot <= filledDots ? 'bg-current' : 'bg-current opacity-25'}"></span>
    {/each}
  </span>
  {$t(DIFFICULTY_LABEL_KEYS[level])}
</span>
