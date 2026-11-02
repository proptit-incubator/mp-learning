<script lang="ts">
  import { Badge } from '@cio/ui/base/badge';
  import { t } from '$lib/utils/functions/translations';

  let { state }: { state: string | null | undefined } = $props();

  const variant = $derived(
    state === 'completed'
      ? 'success'
      : state === 'overdue' || state === 'expired'
        ? 'destructive'
        : state === 'in_progress'
          ? 'warning'
          : state === 'waived'
            ? 'secondary'
            : 'outline'
  );
</script>

{#if state}
  <Badge {variant}>{$t(`enrollment.state.${state}`)}</Badge>
{/if}
