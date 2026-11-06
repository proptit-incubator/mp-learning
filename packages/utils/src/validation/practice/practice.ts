import * as z from 'zod';

export const PRACTICE_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
export const ZPracticeDifficulty = z.enum(PRACTICE_DIFFICULTIES);
export type TPracticeDifficulty = z.infer<typeof ZPracticeDifficulty>;

export const PRACTICE_CALL_STATUSES = ['ACTIVE', 'ENDED'] as const;
export type TPracticeCallStatus = (typeof PRACTICE_CALL_STATUSES)[number];

export const PRACTICE_SPEAKERS = ['customer', 'agent'] as const;
export type TPracticeSpeaker = (typeof PRACTICE_SPEAKERS)[number];

export const ZPracticeScenarioParam = z.object({
  scenarioId: z.uuid()
});
export type TPracticeScenarioParam = z.infer<typeof ZPracticeScenarioParam>;

export const ZPracticeScenarioCreate = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(500).default(''),
  topic: z.string().trim().max(60).default(''),
  difficulty: ZPracticeDifficulty.default('MEDIUM'),
  customerName: z.string().trim().min(1).max(120),
  persona: z.string().trim().min(1).max(4000),
  hiddenContext: z.string().trim().max(4000).default(''),
  objective: z.string().trim().max(1000).default(''),
  tip: z.string().trim().max(500).default(''),
  openingLine: z.string().trim().max(500).default(''),
  evaluationCriteria: z.string().trim().max(2000).default(''),
  voiceId: z.string().trim().max(64).nullable().default(null),
  isPublished: z.boolean().default(true)
});
export type TPracticeScenarioCreate = z.infer<typeof ZPracticeScenarioCreate>;

export const ZPracticeScenarioContent = z.object({
  title: z.string().max(160),
  summary: z.string().max(500),
  topic: z.string().max(60),
  difficulty: ZPracticeDifficulty,
  customerName: z.string().max(120),
  persona: z.string().max(4000),
  hiddenContext: z.string().max(4000),
  objective: z.string().max(1000),
  tip: z.string().max(500),
  openingLine: z.string().max(500),
  evaluationCriteria: z.string().max(2000)
});
export type TPracticeScenarioContent = z.infer<typeof ZPracticeScenarioContent>;

export const PRACTICE_ASSISTANT_MAX_MESSAGES = 40;

export const ZPracticeAssistantMessage = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000)
});
export type TPracticeAssistantMessage = z.infer<typeof ZPracticeAssistantMessage>;

export const ZPracticeScenarioAssistantRequest = z.object({
  messages: z.array(ZPracticeAssistantMessage).min(1).max(PRACTICE_ASSISTANT_MAX_MESSAGES),
  draft: ZPracticeScenarioContent
});
export type TPracticeScenarioAssistantRequest = z.infer<typeof ZPracticeScenarioAssistantRequest>;

export const ZPracticeScenarioAssistantReply = z.object({
  reply: z.string(),
  draft: ZPracticeScenarioContent
});
export type TPracticeScenarioAssistantReply = z.infer<typeof ZPracticeScenarioAssistantReply>;

export const ZPracticeScenarioUpdate = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().max(500).optional(),
    topic: z.string().trim().max(60).optional(),
    difficulty: ZPracticeDifficulty.optional(),
    customerName: z.string().trim().min(1).max(120).optional(),
    persona: z.string().trim().min(1).max(4000).optional(),
    hiddenContext: z.string().trim().max(4000).optional(),
    objective: z.string().trim().max(1000).optional(),
    tip: z.string().trim().max(500).optional(),
    openingLine: z.string().trim().max(500).optional(),
    evaluationCriteria: z.string().trim().max(2000).optional(),
    voiceId: z.string().trim().max(64).nullable().optional(),
    isPublished: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  });
export type TPracticeScenarioUpdate = z.infer<typeof ZPracticeScenarioUpdate>;

export const ZPracticeCallCreate = z.object({
  scenarioId: z.uuid()
});
export type TPracticeCallCreate = z.infer<typeof ZPracticeCallCreate>;

export const ZPracticeCallParam = z.object({
  callId: z.uuid()
});
export type TPracticeCallParam = z.infer<typeof ZPracticeCallParam>;

export const ZPracticeCallReview = z.object({
  score: z.number().int().min(0).max(100).nullable(),
  comment: z.string().trim().max(2000)
});
export type TPracticeCallReview = z.infer<typeof ZPracticeCallReview>;

export const PRACTICE_STATS_RANGES = ['7d', '30d', '90d', 'all'] as const;
export type TPracticeStatsRange = (typeof PRACTICE_STATS_RANGES)[number];

export const ZPracticeStatsQuery = z.object({
  range: z.enum(PRACTICE_STATS_RANGES).default('30d')
});
export type TPracticeStatsQuery = z.infer<typeof ZPracticeStatsQuery>;

export const ZPracticeTurn = z.object({
  speaker: z.enum(PRACTICE_SPEAKERS),
  text: z.string(),
  at: z.string(),
  startMs: z.number().int().nonnegative().optional()
});
export type TPracticeTurn = z.infer<typeof ZPracticeTurn>;

export const ZPracticeCriterionScore = z.object({
  name: z.string().describe('Tên tiêu chí, ngắn gọn'),
  score: z.number().int().min(0).max(10).describe('Điểm từ 0 đến 10'),
  comment: z.string().describe('Nhận xét một câu, dẫn chứng từ cuộc gọi')
});
export type TPracticeCriterionScore = z.infer<typeof ZPracticeCriterionScore>;

export const ZPracticeFeedback = z.object({
  score: z.number().int().min(0).max(100).describe('Điểm tổng từ 0 đến 100'),
  summary: z.string().describe('Nhận xét tổng quan 2-3 câu'),
  strengths: z.array(z.string()).max(5).describe('Điểm làm tốt, mỗi ý một câu'),
  improvements: z.array(z.string()).max(5).describe('Điểm cần cải thiện kèm cách nói tốt hơn, mỗi ý một câu'),
  criteria: z.array(ZPracticeCriterionScore).max(8)
});
export type TPracticeFeedback = z.infer<typeof ZPracticeFeedback>;

export const ZPracticeSocketMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(2000) }),
  z.object({ type: z.literal('mic'), on: z.boolean() })
]);
export type TPracticeSocketMessage = z.infer<typeof ZPracticeSocketMessage>;

export const PRACTICE_NOTICE_CODES = ['STT_FAILED', 'TTS_FAILED', 'REPLY_FAILED', 'TIME_LIMIT', 'REPLACED'] as const;
export type TPracticeNoticeCode = (typeof PRACTICE_NOTICE_CODES)[number];

/** Binary audio frames start with the sample rate and the reply id, each a little-endian uint32, then PCM s16le. */
export const PRACTICE_AUDIO_HEADER_BYTES = 8;

export const PRACTICE_STT_SAMPLE_RATE = 16000;

export type TPracticeServerEvent =
  | { type: 'ready'; transcript: TPracticeTurn[]; stt: boolean; tts: boolean; remainingSeconds: number }
  | { type: 'agent_partial'; text: string }
  | { type: 'turn'; turn: TPracticeTurn }
  | { type: 'customer_start'; replyId: number }
  | { type: 'customer_delta'; replyId: number; text: string }
  | { type: 'customer_end'; replyId: number; text: string; interrupted: boolean }
  | { type: 'speech_end'; replyId: number; interrupted: boolean }
  | { type: 'notice'; code: TPracticeNoticeCode }
  | { type: 'ended' };
