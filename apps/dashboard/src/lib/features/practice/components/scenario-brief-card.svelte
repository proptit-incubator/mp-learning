<script lang="ts">
  import LightbulbIcon from '@lucide/svelte/icons/lightbulb';
  import TargetIcon from '@lucide/svelte/icons/target';

  import { t } from '$lib/utils/functions/translations';
  import type { PracticeCallScenario } from '$features/practice/utils/types';

  interface Props {
    scenario: PracticeCallScenario;
  }

  let { scenario }: Props = $props();
</script>

<section class="ui:bg-card rounded-2xl border p-5">
  <p class="text-sm font-semibold">{$t('practice.brief.title')}</p>
  <p class="ui:text-muted-foreground mt-3 text-sm leading-relaxed whitespace-pre-line">{scenario.persona}</p>

  {#if scenario.objective}
    <p class="ui:text-muted-foreground mt-4 flex gap-2 text-xs leading-relaxed">
      <TargetIcon class="ui:text-danger-foreground mt-0.5 size-3.5 shrink-0" />
      <span>
        <span class="ui:text-foreground font-semibold">{$t('practice.brief.objective')}</span>
        {scenario.objective}
      </span>
    </p>
  {/if}

  {#if scenario.tip}
    <p class="ui:bg-info-soft ui:text-info-foreground mt-4 flex gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed">
      <LightbulbIcon class="mt-0.5 size-3.5 shrink-0" />
      <span>{scenario.tip}</span>
    </p>
  {/if}
</section>
