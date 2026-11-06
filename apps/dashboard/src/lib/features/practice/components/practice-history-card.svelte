<script lang="ts">
  import { Skeleton } from '@cio/ui/base/skeleton';

  import { t } from '$lib/utils/functions/translations';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { formatCallDuration, scoreToneClass } from '$features/practice/utils/practice-utils';
  import type { PracticeCallSummary } from '$features/practice/utils/types';

  interface Props {
    calls: PracticeCallSummary[] | null;
    reviewHref: (callId: string) => string;
  }

  let { calls, reviewHref }: Props = $props();
</script>

<section class="ui:bg-card rounded-2xl border p-5">
  <p class="text-sm font-semibold">{$t('practice.history.title')}</p>

  <div class="mt-3 flex flex-col gap-1">
    {#if !calls}
      {#each [0, 1, 2] as index (index)}
        <Skeleton class="h-12 w-full rounded-lg" />
      {/each}
    {:else}
      {#each calls as call (call.id)}
        <a
          href={reviewHref(call.id)}
          class="ui:hover:bg-muted/60 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{call.scenarioTitle}</p>
            <p class="ui:text-muted-foreground text-xs">
              {calDateDiff(call.startedAt)}
              {#if call.durationSeconds !== null}
                · {formatCallDuration(call.durationSeconds)}
              {/if}
            </p>
          </div>
          {#if call.status === 'ACTIVE'}
            <span class="ui:text-muted-foreground shrink-0 text-xs">{$t('practice.history.in_progress')}</span>
          {:else if (call.reviewScore ?? call.score) === null}
            <span class="ui:text-muted-foreground shrink-0 text-xs">{$t('practice.history.no_score')}</span>
          {:else}
            <span class="shrink-0 text-right">
              <span class="block text-sm font-semibold tabular-nums {scoreToneClass(call.reviewScore ?? call.score)}">
                {call.reviewScore ?? call.score}
              </span>
              {#if call.reviewedAt}
                <span class="ui:text-muted-foreground block text-[10px]">{$t('practice.history.reviewed')}</span>
              {/if}
            </span>
          {/if}
        </a>
      {:else}
        <p class="ui:text-muted-foreground py-2 text-xs">{$t('practice.history.empty')}</p>
      {/each}
    {/if}
  </div>
</section>
