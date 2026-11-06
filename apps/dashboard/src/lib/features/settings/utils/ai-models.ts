import { getModelLabel, getModelProvider, type VoiceCallModelId } from '@cio/utils/agent-models';

export interface AiModelOption {
  id: VoiceCallModelId;
  label: string;
  /** False when the server has no API key for this model's provider. */
  available: boolean;
}

/** Models the organization can pick from, keeping the current choice listed even when its key was removed. */
export function buildModelOptions(
  modelIds: readonly VoiceCallModelId[],
  providers: readonly string[],
  current: VoiceCallModelId
): AiModelOption[] {
  return modelIds
    .map((id) => ({ id, label: getModelLabel(id), available: providers.includes(getModelProvider(id)) }))
    .filter((option) => option.available || option.id === current);
}
