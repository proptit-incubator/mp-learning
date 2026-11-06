<script lang="ts">
  import { untrack } from 'svelte';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Field from '@cio/ui/base/field';
  import * as Select from '@cio/ui/base/select';
  import { Button } from '@cio/ui/base/button';
  import { Switch } from '@cio/ui/base/switch';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';

  import { t } from '$lib/utils/functions/translations';
  import { practiceApi } from '$features/practice/api/practice.svelte';
  import {
    DIFFICULTY_LABEL_KEYS,
    emptyScenarioDraft,
    scenarioToDraft,
    toDifficulty
  } from '$features/practice/utils/practice-utils';
  import type { ManagedPracticeScenario, PracticeScenarioDraft } from '$features/practice/utils/types';
  import { PRACTICE_DIFFICULTIES } from '@cio/utils/validation/practice';

  interface Props {
    open: boolean;
    scenario: ManagedPracticeScenario | null;
    /** Pre-fills the form instead of the scenario's saved values, e.g. with the AI assistant's draft. */
    initialDraft?: PracticeScenarioDraft | null;
    voices: string[];
    defaultVoice: string;
    onSaved?: (title: string) => void;
  }

  let { open = $bindable(), scenario, initialDraft = null, voices, defaultVoice, onSaved }: Props = $props();

  const DEFAULT_VOICE_VALUE = 'default';

  const draft = $state(untrack(() => initialFormDraft()));

  const isEdit = $derived(scenario !== null);
  const voiceValue = $derived(draft.voiceId || DEFAULT_VOICE_VALUE);
  const voiceLabel = $derived(draft.voiceId || $t('practice.admin.form.voice_default', { voice: defaultVoice }));

  function initialFormDraft(): PracticeScenarioDraft {
    if (initialDraft) return { ...initialDraft };

    return scenario ? scenarioToDraft(scenario) : emptyScenarioDraft();
  }

  function handleOpenChange(nextOpen: boolean) {
    open = nextOpen;

    if (!nextOpen) practiceApi.resetErrors();
  }

  function handleVoiceChange(value: string) {
    draft.voiceId = value === DEFAULT_VOICE_VALUE ? '' : value;
  }

  async function handleSubmit() {
    const payload = { ...draft, voiceId: draft.voiceId || null };
    const saved = scenario
      ? await practiceApi.updateScenario(scenario.id, payload)
      : await practiceApi.createScenario(payload);

    if (!saved) return;

    onSaved?.(draft.title);
    handleOpenChange(false);
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Content class="max-h-[92vh] w-[95%] max-w-3xl! overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>
        {$t(isEdit ? 'practice.admin.form.edit_title' : 'practice.admin.form.create_title')}
      </Dialog.Title>
    </Dialog.Header>

    <Field.Group class="min-w-0 py-2">
      <Field.Set>
        <Field.Legend>{$t('practice.admin.form.general')}</Field.Legend>
        <Field.Group>
          <InputField
            label={$t('practice.admin.form.title')}
            placeholder={$t('practice.admin.form.title_placeholder')}
            bind:value={draft.title}
            errorMessage={practiceApi.errors.title}
            isRequired
            testId="practice-scenario-title"
          />
          <TextareaField
            label={$t('practice.admin.form.summary')}
            placeholder={$t('practice.admin.form.summary_placeholder')}
            bind:value={draft.summary}
            errorMessage={practiceApi.errors.summary}
            rows={2}
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <InputField
              label={$t('practice.admin.form.topic')}
              placeholder={$t('practice.admin.form.topic_placeholder')}
              bind:value={draft.topic}
              errorMessage={practiceApi.errors.topic}
            />
            <Field.Field>
              <Field.Label>{$t('practice.admin.form.difficulty')}</Field.Label>
              <Select.Root
                type="single"
                value={draft.difficulty}
                onValueChange={(value) => (draft.difficulty = toDifficulty(value))}
              >
                <Select.Trigger class="w-full">{$t(DIFFICULTY_LABEL_KEYS[draft.difficulty])}</Select.Trigger>
                <Select.Content>
                  {#each PRACTICE_DIFFICULTIES as difficulty (difficulty)}
                    <Select.Item value={difficulty}>{$t(DIFFICULTY_LABEL_KEYS[difficulty])}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
            </Field.Field>
          </div>
          <Field.Field orientation="horizontal">
            <Switch bind:checked={draft.isPublished} />
            <Field.Label>{$t('practice.admin.form.published')}</Field.Label>
          </Field.Field>
        </Field.Group>
      </Field.Set>

      <Field.Separator />

      <Field.Set>
        <Field.Legend>{$t('practice.admin.form.customer')}</Field.Legend>
        <Field.Description>{$t('practice.admin.form.customer_description')}</Field.Description>
        <Field.Group>
          <InputField
            label={$t('practice.admin.form.customer_name')}
            placeholder={$t('practice.admin.form.customer_name_placeholder')}
            bind:value={draft.customerName}
            errorMessage={practiceApi.errors.customerName}
            isRequired
          />
          <TextareaField
            label={$t('practice.admin.form.persona')}
            placeholder={$t('practice.admin.form.persona_placeholder')}
            helperMessage={$t('practice.admin.form.persona_helper')}
            bind:value={draft.persona}
            errorMessage={practiceApi.errors.persona}
            isRequired
            rows={5}
          />
          <TextareaField
            label={$t('practice.admin.form.hidden_context')}
            placeholder={$t('practice.admin.form.hidden_context_placeholder')}
            helperMessage={$t('practice.admin.form.hidden_context_helper')}
            bind:value={draft.hiddenContext}
            errorMessage={practiceApi.errors.hiddenContext}
            rows={3}
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <InputField
              label={$t('practice.admin.form.opening_line')}
              placeholder={$t('practice.admin.form.opening_line_placeholder')}
              helperMessage={$t('practice.admin.form.opening_line_helper')}
              bind:value={draft.openingLine}
              errorMessage={practiceApi.errors.openingLine}
            />
            <Field.Field>
              <Field.Label>{$t('practice.admin.form.voice')}</Field.Label>
              <Select.Root type="single" value={voiceValue} onValueChange={handleVoiceChange}>
                <Select.Trigger class="w-full">{voiceLabel}</Select.Trigger>
                <Select.Content>
                  <Select.Item value={DEFAULT_VOICE_VALUE}>
                    {$t('practice.admin.form.voice_default', { voice: defaultVoice })}
                  </Select.Item>
                  {#each voices as voice (voice)}
                    <Select.Item value={voice}>{voice}</Select.Item>
                  {/each}
                </Select.Content>
              </Select.Root>
              {#if practiceApi.errors.voiceId}
                <Field.Error>{practiceApi.errors.voiceId}</Field.Error>
              {/if}
            </Field.Field>
          </div>
        </Field.Group>
      </Field.Set>

      <Field.Separator />

      <Field.Set>
        <Field.Legend>{$t('practice.admin.form.coaching')}</Field.Legend>
        <Field.Group>
          <TextareaField
            label={$t('practice.admin.form.objective')}
            placeholder={$t('practice.admin.form.objective_placeholder')}
            bind:value={draft.objective}
            errorMessage={practiceApi.errors.objective}
            rows={2}
          />
          <InputField
            label={$t('practice.admin.form.tip')}
            placeholder={$t('practice.admin.form.tip_placeholder')}
            bind:value={draft.tip}
            errorMessage={practiceApi.errors.tip}
          />
          <TextareaField
            label={$t('practice.admin.form.criteria')}
            placeholder={$t('practice.admin.form.criteria_placeholder')}
            helperMessage={$t('practice.admin.form.criteria_helper')}
            bind:value={draft.evaluationCriteria}
            errorMessage={practiceApi.errors.evaluationCriteria}
            rows={4}
          />
        </Field.Group>
      </Field.Set>
    </Field.Group>

    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={() => handleOpenChange(false)}>
        {$t('practice.admin.form.cancel')}
      </Button>
      <Button size="sm" loading={practiceApi.isSaving} onclick={handleSubmit} testId="practice-scenario-save">
        {$t('practice.admin.form.save')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
