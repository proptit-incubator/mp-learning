<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import { sidePanel } from './utils/store.svelte';

  const closedToggleable = $derived(
    sidePanel.toggleable.filter((definition) => definition.id !== sidePanel.activePanelId)
  );
</script>

{#each closedToggleable as definition (definition.id)}
  <Button
    size="sm"
    variant="outline"
    aria-label={$t(definition.toggleLabelKey ?? '')}
    onclick={() => sidePanel.open(definition.id)}
    testId={`side-panel-toggle-${definition.id}`}
  >
    {#if definition.toggleIcon}
      <definition.toggleIcon size={14} class="ui:text-brand-cyan" />
    {/if}
    <span class="hidden sm:inline">{$t(definition.toggleLabelKey ?? '')}</span>
  </Button>
{/each}
