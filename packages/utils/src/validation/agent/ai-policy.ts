import { z } from 'zod';
import {
  AGENT_MODEL_IDS,
  DEFAULT_ADMIN_ASSISTANT_MODEL_ID,
  DEFAULT_LEARNER_CHAT_MODEL_ID,
  DEFAULT_VOICE_CALL_MODEL_ID,
  VOICE_CALL_MODEL_IDS
} from '../../agent-models';

const MAX_UNITS = 1_000_000_000;

export const PRACTICE_RECORDING_MIN_DAYS = 7;
export const PRACTICE_RECORDING_MAX_DAYS = 90;

/**
 * How an organization lets people use AI. Limits are monthly and counted in cost units: tokens weighted by the
 * model's price, so one unit is one token of the cheapest model.
 */
export const ZAiPolicy = z.object({
  enabled: z.boolean(),
  monthlyLimit: z.number().int().min(0).max(MAX_UNITS),
  authorMonthlyLimit: z.number().int().min(0).max(MAX_UNITS).nullable(),
  learnerMonthlyMessages: z.number().int().min(0).max(10_000),
  /** Default model for staff assistants: course authoring chat and the practice scenario writer. */
  adminAssistantModel: z.enum(AGENT_MODEL_IDS),
  /** Model that plays the customer in practice calls and grades them. */
  voiceCallModel: z.enum(VOICE_CALL_MODEL_IDS),
  /** Voice for practice-call customers whose scenario does not pick one; null uses the server default. */
  voiceCallVoice: z.string().trim().min(1).max(64).nullable(),
  /** Days a practice-call recording is kept after the call ends; transcripts and scores stay. */
  voiceCallRecordingDays: z.number().int().min(PRACTICE_RECORDING_MIN_DAYS).max(PRACTICE_RECORDING_MAX_DAYS),
  /** Model behind the learner AI tutor chat. */
  learnerChatModel: z.enum(AGENT_MODEL_IDS)
});

export type TAiPolicy = z.infer<typeof ZAiPolicy>;

export const ZAiPolicyUpdate = ZAiPolicy.partial();
export type TAiPolicyUpdate = z.infer<typeof ZAiPolicyUpdate>;

export const DEFAULT_AI_POLICY: TAiPolicy = {
  enabled: true,
  monthlyLimit: 15_000_000,
  authorMonthlyLimit: 3_000_000,
  learnerMonthlyMessages: 100,
  adminAssistantModel: DEFAULT_ADMIN_ASSISTANT_MODEL_ID,
  voiceCallModel: DEFAULT_VOICE_CALL_MODEL_ID,
  voiceCallVoice: null,
  voiceCallRecordingDays: 21,
  learnerChatModel: DEFAULT_LEARNER_CHAT_MODEL_ID
};

export function resolveAiPolicy(stored: unknown): TAiPolicy {
  const parsed = ZAiPolicyUpdate.safeParse(stored ?? {});
  return { ...DEFAULT_AI_POLICY, ...(parsed.success ? parsed.data : {}) };
}
