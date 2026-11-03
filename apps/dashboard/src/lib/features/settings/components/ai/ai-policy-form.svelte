<script lang="ts">
  import * as Field from '@cio/ui/base/field';
  import { Switch } from '@cio/ui/base/switch';
  import { Checkbox } from '@cio/ui/base/checkbox';
  import { NumberField } from '@cio/ui/custom/number-field';
  import type { TAiPolicy } from '@cio/utils/validation/agent';
  import { t } from '$lib/utils/functions/translations';
  import { estimateAiCostUsd, formatAiUnits } from './units';

  interface Props {
    policy: TAiPolicy;
    disabled?: boolean;
  }

  let { policy = $bindable(), disabled = false }: Props = $props();

  const MILLION = 1_000_000;

  let lastAuthorLimit = $state(3 * MILLION);
  const authorUnlimited = $derived(policy.authorMonthlyLimit === null);

  const toMillions = (units: number) => units / MILLION;
  const toUnits = (millions: number | null) => Math.round((millions ?? 0) * MILLION);

  function setAuthorLimit(units: number | null) {
    if (units !== null) lastAuthorLimit = units;
    policy = { ...policy, authorMonthlyLimit: units };
  }
</script>

<Field.Group>
  <Field.Set>
    <Field.Legend>{$t('settings.ai.policy.availability')}</Field.Legend>
    <Field.Field orientation="horizontal">
      <Switch
        id="ai-policy-enabled"
        data-testid="ai-policy-enabled"
        checked={policy.enabled}
        onCheckedChange={(checked) => (policy = { ...policy, enabled: checked })}
        {disabled}
      />
      <Field.Content>
        <Field.Label for="ai-policy-enabled">{$t('settings.ai.policy.enabled')}</Field.Label>
        <Field.Description>{$t('settings.ai.policy.enabled_description')}</Field.Description>
      </Field.Content>
    </Field.Field>
  </Field.Set>

  <Field.Separator />

  <Field.Set>
    <Field.Legend>{$t('settings.ai.policy.limits')}</Field.Legend>
    <Field.Description>{$t('settings.ai.policy.limits_description')}</Field.Description>

    <Field.Group>
      <NumberField
        name="ai-monthly-limit"
        label={$t('settings.ai.policy.monthly_limit')}
        bind:value={
          () => toMillions(policy.monthlyLimit), (value) => (policy = { ...policy, monthlyLimit: toUnits(value) })
        }
        min={0}
        max={1000}
        step={0.5}
        isDisabled={disabled || !policy.enabled}
        helperMessage={$t('settings.ai.policy.monthly_limit_help', {
          units: formatAiUnits(policy.monthlyLimit),
          cost: estimateAiCostUsd(policy.monthlyLimit)
        })}
        testId="ai-monthly-limit"
      />

      <div class="flex flex-col gap-3">
        <NumberField
          name="ai-author-limit"
          label={$t('settings.ai.policy.author_limit')}
          bind:value={
            () => toMillions(policy.authorMonthlyLimit ?? lastAuthorLimit), (value) => setAuthorLimit(toUnits(value))
          }
          min={0}
          max={1000}
          step={0.5}
          isDisabled={disabled || !policy.enabled || authorUnlimited}
          helperMessage={authorUnlimited
            ? $t('settings.ai.policy.author_limit_unlimited_help')
            : $t('settings.ai.policy.author_limit_help', { units: formatAiUnits(policy.authorMonthlyLimit ?? 0) })}
          testId="ai-author-limit"
        />
        <Field.Field orientation="horizontal">
          <Checkbox
            id="ai-author-unlimited"
            checked={authorUnlimited}
            onCheckedChange={(checked) => setAuthorLimit(checked === true ? null : lastAuthorLimit)}
            disabled={disabled || !policy.enabled}
          />
          <Field.Label for="ai-author-unlimited" class="font-normal">
            {$t('settings.ai.policy.author_unlimited')}
          </Field.Label>
        </Field.Field>
      </div>

      <NumberField
        name="ai-learner-messages"
        label={$t('settings.ai.policy.learner_messages')}
        bind:value={
          () => policy.learnerMonthlyMessages, (value) => (policy = { ...policy, learnerMonthlyMessages: value ?? 0 })
        }
        integer
        min={0}
        max={10000}
        isDisabled={disabled || !policy.enabled}
        helperMessage={$t('settings.ai.policy.learner_messages_help')}
        testId="ai-learner-messages"
      />
    </Field.Group>
  </Field.Set>
</Field.Group>
