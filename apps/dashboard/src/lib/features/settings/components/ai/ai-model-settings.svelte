<script lang="ts">
  import * as Field from '@cio/ui/base/field';
  import * as Select from '@cio/ui/base/select';
  import { Switch } from '@cio/ui/base/switch';
  import { NumberField } from '@cio/ui/custom/number-field';
  import {
    AGENT_MODEL_IDS,
    VOICE_CALL_MODEL_IDS,
    getModelLabel,
    type AgentModelId,
    type VoiceCallModelId
  } from '@cio/utils/agent-models';
  import {
    PRACTICE_RECORDING_MAX_DAYS,
    PRACTICE_RECORDING_MIN_DAYS,
    type TAiPolicy
  } from '@cio/utils/validation/agent';

  import { t } from '$lib/utils/functions/translations';
  import { buildModelOptions } from '$features/settings/utils/ai-models';

  interface Props {
    policy: TAiPolicy;
    /** Null while the AI tutor settings are still loading. */
    learnerChatEnabled: boolean | null;
    providers: string[];
    voices: string[];
    serverDefaultVoice: string;
    disabled?: boolean;
  }

  let {
    policy = $bindable(),
    learnerChatEnabled = $bindable(),
    providers,
    voices,
    serverDefaultVoice,
    disabled = false
  }: Props = $props();

  const SERVER_VOICE_VALUE = 'server-default';

  const adminOptions = $derived(buildModelOptions(AGENT_MODEL_IDS, providers, policy.adminAssistantModel));
  const voiceCallOptions = $derived(buildModelOptions(VOICE_CALL_MODEL_IDS, providers, policy.voiceCallModel));
  const learnerOptions = $derived(buildModelOptions(AGENT_MODEL_IDS, providers, policy.learnerChatModel));
  const voiceValue = $derived(policy.voiceCallVoice ?? SERVER_VOICE_VALUE);
  const voiceLabel = $derived(
    policy.voiceCallVoice ?? $t('settings.ai.models.voice_server_default', { voice: serverDefaultVoice })
  );
  const isOff = $derived(disabled || !policy.enabled);

  function setVoice(value: string) {
    policy = { ...policy, voiceCallVoice: value === SERVER_VOICE_VALUE ? null : value };
  }
</script>

{#snippet modelSelect(
  id: string,
  value: VoiceCallModelId,
  options: { id: VoiceCallModelId; label: string; available: boolean }[],
  onChange: (value: string) => void,
  isDisabled: boolean
)}
  <Select.Root type="single" {value} onValueChange={onChange} disabled={isDisabled}>
    <Select.Trigger {id} class="w-full sm:w-80" data-testid={id}>{getModelLabel(value)}</Select.Trigger>
    <Select.Content>
      {#each options as option (option.id)}
        <Select.Item value={option.id} disabled={!option.available}>
          {option.label}
          {#if !option.available}
            <span class="ui:text-muted-foreground text-xs">· {$t('settings.ai.models.no_key')}</span>
          {/if}
        </Select.Item>
      {/each}
    </Select.Content>
  </Select.Root>
{/snippet}

<Field.Set>
  <Field.Legend>{$t('settings.ai.models.heading')}</Field.Legend>
  <Field.Description>{$t('settings.ai.models.description')}</Field.Description>

  <Field.Group>
    <Field.Field>
      <Field.Label for="ai-model-admin">{$t('settings.ai.models.admin_assistant')}</Field.Label>
      {@render modelSelect(
        'ai-model-admin',
        policy.adminAssistantModel,
        adminOptions,
        (value) => (policy = { ...policy, adminAssistantModel: value as AgentModelId }),
        isOff
      )}
      <Field.Description>{$t('settings.ai.models.admin_assistant_help')}</Field.Description>
    </Field.Field>

    <Field.Separator />

    <Field.Field>
      <Field.Label for="ai-model-voice-call">{$t('settings.ai.models.voice_call')}</Field.Label>
      {@render modelSelect(
        'ai-model-voice-call',
        policy.voiceCallModel,
        voiceCallOptions,
        (value) => (policy = { ...policy, voiceCallModel: value as VoiceCallModelId }),
        disabled
      )}
      <Field.Description>{$t('settings.ai.models.voice_call_help')}</Field.Description>
    </Field.Field>

    <Field.Field>
      <Field.Label for="ai-model-voice">{$t('settings.ai.models.voice')}</Field.Label>
      <Select.Root type="single" value={voiceValue} onValueChange={setVoice} {disabled}>
        <Select.Trigger id="ai-model-voice" class="w-full sm:w-80" data-testid="ai-model-voice">
          {voiceLabel}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value={SERVER_VOICE_VALUE}>
            {$t('settings.ai.models.voice_server_default', { voice: serverDefaultVoice })}
          </Select.Item>
          {#each voices as voice (voice)}
            <Select.Item value={voice}>{voice}</Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
      <Field.Description>{$t('settings.ai.models.voice_help')}</Field.Description>
    </Field.Field>

    <NumberField
      name="ai-recording-days"
      label={$t('settings.ai.models.recording_days')}
      bind:value={
        () => policy.voiceCallRecordingDays,
        (value) => (policy = { ...policy, voiceCallRecordingDays: Math.round(value ?? PRACTICE_RECORDING_MIN_DAYS) })
      }
      integer
      min={PRACTICE_RECORDING_MIN_DAYS}
      max={PRACTICE_RECORDING_MAX_DAYS}
      isDisabled={disabled}
      helperMessage={$t('settings.ai.models.recording_days_help', {
        min: PRACTICE_RECORDING_MIN_DAYS,
        max: PRACTICE_RECORDING_MAX_DAYS
      })}
      testId="ai-recording-days"
    />

    <Field.Separator />

    <Field.Field orientation="horizontal">
      <Switch
        id="ai-learner-chat-enabled"
        data-testid="ai-learner-chat-enabled"
        checked={learnerChatEnabled ?? false}
        onCheckedChange={(checked) => (learnerChatEnabled = checked)}
        disabled={isOff || learnerChatEnabled === null}
      />
      <Field.Content>
        <Field.Label for="ai-learner-chat-enabled">{$t('settings.ai.models.learner_chat_enabled')}</Field.Label>
        <Field.Description>{$t('settings.ai.models.learner_chat_enabled_help')}</Field.Description>
      </Field.Content>
    </Field.Field>

    <Field.Field>
      <Field.Label for="ai-model-learner">{$t('settings.ai.models.learner_chat')}</Field.Label>
      {@render modelSelect(
        'ai-model-learner',
        policy.learnerChatModel,
        learnerOptions,
        (value) => (policy = { ...policy, learnerChatModel: value as AgentModelId }),
        isOff || learnerChatEnabled === false
      )}
      <Field.Description>{$t('settings.ai.models.learner_chat_help')}</Field.Description>
    </Field.Field>
  </Field.Group>
</Field.Set>
