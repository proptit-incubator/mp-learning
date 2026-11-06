<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { NumberField } from '@cio/ui/custom/number-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import MessageSquareQuoteIcon from '@lucide/svelte/icons/message-square-quote';

  import { t } from '$lib/utils/functions/translations';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import { scoreToneClass } from '$features/practice/utils/practice-utils';
  import type { PracticeCallDetail, PracticeReviewDraft } from '$features/practice/utils/types';

  interface Props {
    call: PracticeCallDetail;
    canReview: boolean;
    onSaved: (call: PracticeCallDetail) => void;
  }

  let { call, canReview, onSaved }: Props = $props();

  let isEditing = $state(false);
  let draft = $state<PracticeReviewDraft>({ score: null, comment: '' });

  const review = $derived(call.review);
  const isEnded = $derived(call.status === 'ENDED');

  function startEditing() {
    draft.score = review?.score ?? null;
    draft.comment = review?.comment ?? '';
    isEditing = true;
  }

  async function save() {
    const updated = await practiceApi.reviewCall(call.id, { score: draft.score, comment: draft.comment });
    if (!updated) return;

    isEditing = false;
    onSaved(updated);
  }
</script>

{#if review || (canReview && isEnded)}
  <section class="ui:bg-card rounded-2xl border p-5" data-testid="practice-trainer-review">
    <div class="flex items-center justify-between gap-3">
      <p class="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareQuoteIcon class="ui:text-primary size-4" />
        {$t('practice.trainer_review.title')}
      </p>
      {#if canReview && isEnded && !isEditing}
        <Button size="xs" variant="outline" onclick={startEditing} testId="practice-trainer-review-edit">
          {$t(review ? 'practice.trainer_review.edit' : 'practice.trainer_review.add')}
        </Button>
      {/if}
    </div>

    {#if isEditing}
      <div class="mt-3 flex flex-col gap-3">
        <NumberField
          label={$t('practice.trainer_review.score')}
          helperMessage={$t('practice.trainer_review.score_helper')}
          bind:value={draft.score}
          min={0}
          max={100}
          integer
          allowEmpty
          errorMessage={practiceApi.errors.score ?? ''}
        />
        <TextareaField
          label={$t('practice.trainer_review.comment')}
          placeholder={$t('practice.trainer_review.comment_placeholder')}
          bind:value={draft.comment}
          rows={4}
          errorMessage={practiceApi.errors.comment ?? ''}
        />
        <div class="flex justify-end gap-2">
          <Button size="sm" variant="outline" onclick={() => (isEditing = false)}>
            {$t('practice.trainer_review.cancel')}
          </Button>
          <Button size="sm" loading={practiceApi.isSavingReview} onclick={save} testId="practice-trainer-review-save">
            {$t('practice.trainer_review.save')}
          </Button>
        </div>
      </div>
    {:else if review}
      {#if review.score !== null}
        <p class="mt-3 text-2xl font-bold tabular-nums {scoreToneClass(review.score)}">
          {review.score}<span class="ui:text-muted-foreground text-sm font-medium"
            >{$t('practice.feedback.score_suffix')}</span
          >
        </p>
      {/if}
      {#if review.comment}
        <p class="mt-2 text-sm leading-relaxed whitespace-pre-line">{review.comment}</p>
      {/if}
      <p class="ui:text-muted-foreground mt-2 text-xs">
        {$t('practice.trainer_review.by', {
          name: review.reviewerName ?? $t('practice.trainer_review.unknown_reviewer'),
          time: calDateDiff(review.reviewedAt)
        })}
      </p>
    {:else}
      <p class="ui:text-muted-foreground mt-2 text-xs">{$t('practice.trainer_review.empty')}</p>
    {/if}
  </section>
{/if}
