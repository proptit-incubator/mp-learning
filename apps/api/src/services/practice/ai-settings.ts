import { env } from '@cio/core/config/env';
import { getAiPolicy } from '@cio/core/services/agent/usage';
import type { AgentModelId, VoiceCallModelId } from '@cio/utils/agent-models';

import { TTS_VOICES } from './voice/tts-stream';

export interface PracticeAiSettings {
  voiceCallModel: VoiceCallModelId;
  /** Voice for customers whose scenario does not pick one. */
  defaultVoice: string;
  adminAssistantModel: AgentModelId;
  /** Days a recording is kept after the call ends. */
  recordingDays: number;
}

function isKnownVoice(voiceId: string | null): voiceId is string {
  return voiceId !== null && (TTS_VOICES as readonly string[]).includes(voiceId);
}

/** The organization's model and voice choices for practice calls, with server defaults filled in. */
export async function getPracticeAiSettings(orgId: string): Promise<PracticeAiSettings> {
  const policy = await getAiPolicy(orgId);
  const defaultVoice = isKnownVoice(policy.voiceCallVoice) ? policy.voiceCallVoice : env.TTS_VOICE_ID;

  return {
    voiceCallModel: policy.voiceCallModel,
    defaultVoice,
    adminAssistantModel: policy.adminAssistantModel,
    recordingDays: policy.voiceCallRecordingDays
  };
}
