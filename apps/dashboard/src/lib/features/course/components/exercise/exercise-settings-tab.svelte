<script lang="ts">
  import { Switch } from '@cio/ui/base/switch';
  import { Label } from '@cio/ui/base/label';
  import { Button } from '@cio/ui/base/button';
  import { NumberField } from '@cio/ui/custom/number-field';
  import { questionnaire } from './store';
  import { exerciseApi } from '$features/course/api';
  import { courseApi } from '$features/course/api';
  import { t } from '$lib/utils/functions/translations';
  import { snackbar } from '$features/ui/snackbar/store';
  import * as Select from '@cio/ui/base/select';
  import { EXERCISE_ANSWER_VISIBILITIES } from '@cio/utils/validation/exercise';

  type Props = {
    exerciseId: string;
    onBeforeSave?: () => Promise<boolean> | boolean;
    totalSubmissions?: number;
  };

  let { exerciseId, onBeforeSave = () => true, totalSubmissions = 0 }: Props = $props();

  let saving = $state(false);

  async function saveSettings() {
    if (!courseApi.course?.id) return;
    const canSave = await onBeforeSave();
    if (!canSave) return;

    saving = true;

    const allowMultipleAttempts = !!$questionnaire.allowMultipleAttempts;
    const completionPolicy = $questionnaire.completionPolicy ?? 'submitted';
    const passThreshold = $questionnaire.passThreshold ?? 100;

    await exerciseApi.update(courseApi.course.id, exerciseId, {
      allowMultipleAttempts,
      maxAttempts: allowMultipleAttempts ? ($questionnaire.maxAttempts ?? null) : null,
      answerVisibility: $questionnaire.answerVisibility ?? 'after_completion',
      completionPolicy,
      passThreshold
    });
    saving = false;

    if (exerciseApi.success) {
      snackbar.success('snackbar.exercise.success');
    }
  }
</script>

<div class="max-w-xl space-y-6">
  <div class="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
    <div class="space-y-1">
      <Label for="allow-multiple" class="text-sm font-medium dark:text-gray-100">
        {$t('course.navItem.lessons.exercises.all_exercises.settings_allow_multiple')}
      </Label>
      <p class="ui:text-muted-foreground text-sm">
        {$t('course.navItem.lessons.exercises.all_exercises.settings_allow_multiple_helper')}
      </p>
    </div>
    <Switch
      id="allow-multiple"
      checked={!!$questionnaire.allowMultipleAttempts}
      onCheckedChange={(checked) => {
        questionnaire.update((q) => ({ ...q, allowMultipleAttempts: checked }));
      }}
    />
  </div>

  {#if $questionnaire.allowMultipleAttempts}
    <div class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
      <NumberField
        integer
        allowEmpty
        min={1}
        max={100}
        label={$t('course.navItem.lessons.exercises.all_exercises.settings_max_attempts')}
        placeholder={$t('course.navItem.lessons.exercises.all_exercises.settings_max_attempts_unlimited')}
        helperMessage={$t('course.navItem.lessons.exercises.all_exercises.settings_max_attempts_helper')}
        value={$questionnaire.maxAttempts ?? null}
        onValueChange={(next) => {
          questionnaire.update((state) => ({ ...state, maxAttempts: next }));
        }}
      />
    </div>
  {/if}

  <div class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
    <Label class="mb-2 block text-sm font-medium dark:text-gray-100">
      {$t('course.navItem.lessons.exercises.all_exercises.settings_answer_visibility')}
    </Label>
    <Select.Root
      type="single"
      value={$questionnaire.answerVisibility ?? 'after_completion'}
      onValueChange={(value) => {
        const visibility = EXERCISE_ANSWER_VISIBILITIES.find((option) => option === value);
        if (visibility) questionnaire.update((state) => ({ ...state, answerVisibility: visibility }));
      }}
    >
      <Select.Trigger class="w-full">
        {$t(
          `course.navItem.lessons.exercises.all_exercises.settings_answer_visibility_${$questionnaire.answerVisibility ?? 'after_completion'}`
        )}
      </Select.Trigger>
      <Select.Content>
        {#each EXERCISE_ANSWER_VISIBILITIES as visibility (visibility)}
          <Select.Item value={visibility}>
            {$t(`course.navItem.lessons.exercises.all_exercises.settings_answer_visibility_${visibility}`)}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
    <p class="ui:text-muted-foreground mt-2 text-sm">
      {$t('course.navItem.lessons.exercises.all_exercises.settings_answer_visibility_helper')}
    </p>
  </div>

  <div class="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
    <Label class="mb-2 block text-sm font-medium dark:text-gray-100">
      {$t('course.navItem.lessons.exercises.all_exercises.settings_completion_policy')}
    </Label>
    <Select.Root
      type="single"
      value={$questionnaire.completionPolicy ?? 'submitted'}
      onValueChange={(value) => {
        if (value === 'submitted' || value === 'passed') {
          questionnaire.update((state) => ({ ...state, completionPolicy: value }));
        }
      }}
    >
      <Select.Trigger class="w-full">
        {($questionnaire.completionPolicy ?? 'submitted') === 'passed'
          ? $t('course.navItem.lessons.exercises.all_exercises.settings_completion_passed')
          : $t('course.navItem.lessons.exercises.all_exercises.settings_completion_submitted')}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="submitted">
          {$t('course.navItem.lessons.exercises.all_exercises.settings_completion_submitted')}
        </Select.Item>
        <Select.Item value="passed">
          {$t('course.navItem.lessons.exercises.all_exercises.settings_completion_passed')}
        </Select.Item>
      </Select.Content>
    </Select.Root>

    {#if ($questionnaire.completionPolicy ?? 'submitted') === 'passed'}
      <div class="mt-4 space-y-3">
        <div class="space-y-2 text-sm">
          <p class="ui:text-muted-foreground">
            {$t('course.navItem.lessons.exercises.all_exercises.settings_completion_passed_helper')}
          </p>
          <p class="text-amber-700 dark:text-amber-300">
            {$t('course.navItem.lessons.exercises.all_exercises.settings_manual_grading_warning')}
          </p>
          {#if !$questionnaire.allowMultipleAttempts}
            <p class="text-amber-700 dark:text-amber-300">
              {$t('course.navItem.lessons.exercises.all_exercises.settings_single_attempt_warning')}
            </p>
          {/if}
          {#if totalSubmissions > 0}
            <p class="text-amber-700 dark:text-amber-300">
              {$t('course.navItem.lessons.exercises.all_exercises.settings_existing_submissions_warning')}
            </p>
          {/if}
        </div>
        <NumberField
          integer
          min={0}
          max={100}
          label={$t('course.navItem.lessons.exercises.all_exercises.settings_pass_threshold')}
          value={$questionnaire.passThreshold ?? 100}
          onValueChange={(next) => {
            questionnaire.update((state) => ({ ...state, passThreshold: next ?? 100 }));
          }}
        />
      </div>
    {/if}
  </div>

  <Button onclick={saveSettings} loading={saving} disabled={!courseApi.course?.id}>
    {$t('course.navItem.lessons.exercises.all_exercises.settings_save')}
  </Button>
</div>
