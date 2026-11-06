import { generateObject, streamText, type ModelMessage } from 'ai';
import { AIProvider, createModel, getProviderConfigForProvider } from '@cio/ai-assistant';
import { getModelProvider, type VoiceCallModelId } from '@cio/utils/agent-models';
import type { TPracticeScenario } from '@cio/db/types';
import {
  ZPracticeFeedback,
  type TPracticeDifficulty,
  type TPracticeFeedback,
  type TPracticeTurn
} from '@cio/utils/validation/practice';

import { AppError, ErrorCodes } from '@api/utils/errors';

const CALL_CONNECTED_MARKER = '[Cuộc gọi vừa được kết nối. Bạn nói câu đầu tiên.]';

// Gemini 3.x cannot switch thinking off, so `minimal` stands in for reasoning_effort "none".
// @ai-sdk/openai 3.0.x only knows gpt-5 and older as reasoning models and drops reasoningEffort for gpt-6 unless forced.
export const PROVIDER_OPTIONS = {
  google: { thinkingConfig: { thinkingLevel: 'minimal' as const } },
  openai: { reasoningEffort: 'none' as const, forceReasoning: true }
};

const DIFFICULTY_BEHAVIOUR: Record<TPracticeDifficulty, string> = {
  EASY: 'Bạn dễ tính và hợp tác. Chỉ cần nhân viên lịch sự, giải thích đúng là bạn chấp nhận.',
  MEDIUM:
    'Bạn có băn khoăn hoặc hơi khó chịu. Bạn chỉ hợp tác khi nhân viên lắng nghe, đồng cảm và giải thích rõ ràng, dễ hiểu.',
  HARD: 'Bạn khó tính, cảm xúc mạnh, hay phản bác và ngắt lời. Bạn chỉ dịu lại khi nhân viên thật sự lắng nghe, xin lỗi đúng lúc và đưa ra cam kết cụ thể; nếu nhân viên vòng vo hay đổ lỗi thì bạn càng bực.'
};

/** Whether the server has an API key for the provider that runs `modelId`. */
export function isPracticeModelConfigured(modelId: VoiceCallModelId): boolean {
  return getProviderConfigForProvider(getModelProvider(modelId) as AIProvider) !== null;
}

export function createPracticeModel(modelId: VoiceCallModelId) {
  const providerConfig = getProviderConfigForProvider(getModelProvider(modelId) as AIProvider);
  if (!providerConfig) {
    throw new AppError(`No API key for ${modelId}`, ErrorCodes.PRACTICE_AI_NOT_CONFIGURED, 503);
  }

  return createModel({ ...providerConfig, model: modelId });
}

function optionalSection(heading: string, body: string): string {
  return body.trim() ? `\n\n## ${heading}\n${body.trim()}` : '';
}

function buildCustomerSystemPrompt(scenario: TPracticeScenario): string {
  const difficulty = DIFFICULTY_BEHAVIOUR[scenario.difficulty as TPracticeDifficulty] ?? DIFFICULTY_BEHAVIOUR.MEDIUM;

  return `Bạn đóng vai KHÁCH HÀNG trong một cuộc gọi điện thoại luyện tập. Người nói chuyện với bạn là nhân viên chăm sóc khách hàng / bán hàng đang được đào tạo.

## Nhân vật của bạn
${scenario.customerName}

## Tình huống
${scenario.title}${optionalSection('Kịch bản nhập vai', scenario.persona)}${optionalSection('Thông tin chỉ bạn biết (không tự nói ra nếu nhân viên không khai thác)', scenario.hiddenContext)}

## Mức độ khó
${difficulty}

## Quy tắc trả lời
- Chỉ nói lời thoại của khách hàng, bằng tiếng Việt nói tự nhiên qua điện thoại. Mỗi lượt 1–3 câu ngắn.
- Nói như một khách hàng thật đang gọi lên tổng đài: đi thẳng vào việc, xưng "tôi"/"em"/"chị"/"anh" theo nhân vật, gọi nhân viên là "em" hoặc "bạn". Không mở đầu câu bằng "Dạ", "Vâng", "Dạ vâng", không thêm "ạ" cuối câu, không cảm ơn hay xin lỗi rập khuôn — đó là cách nói của nhân viên, không phải khách. Chỉ khách lớn tuổi hoặc nhân vật được mô tả là lễ phép mới nói mềm hơn.
- Dùng khẩu ngữ đời thường như khách thật: "ừ", "ờ", "thế à", "vậy hả", "thôi được", "nói nhanh giúp tôi", "thế giờ sao". Có thể bực, ngắt lời, hỏi dồn khi tính cách nhân vật như vậy.
- Không mô tả hành động, không dùng ngoặc, dấu *, markdown, emoji hay ký hiệu. Câu trả lời sẽ được đọc thành tiếng.
- Không bao giờ thoát vai, không nhận mình là AI, không hướng dẫn hay nhận xét nhân viên.
- Lời của nhân viên được chuyển từ giọng nói nên có thể sai chính tả hoặc thiếu dấu; hiểu theo ngữ cảnh, nếu thật sự không hiểu thì hỏi lại như khách hàng bình thường.
- Phản ứng đúng với cách nhân viên xử lý: xử lý tốt thì bạn dịu lại và hợp tác, xử lý kém thì bạn phản ứng theo tính cách nhân vật.
- Khi vấn đề đã được giải quyết hoặc nhân viên chào kết thúc, hãy cảm ơn và chào tạm biệt ngắn gọn.`;
}

function toModelMessages(transcript: TPracticeTurn[]): ModelMessage[] {
  const turns: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: CALL_CONNECTED_MARKER }
  ];

  for (const turn of transcript) {
    const role = turn.speaker === 'customer' ? 'assistant' : 'user';
    const previous = turns[turns.length - 1];

    if (previous.role === role) {
      previous.content = `${previous.content}\n${turn.text}`;
      continue;
    }

    turns.push({ role, content: turn.text });
  }

  return turns;
}

/** Streams the customer's next line for the conversation so far. */
export function streamCustomerReply(
  scenario: TPracticeScenario,
  transcript: TPracticeTurn[],
  abortSignal: AbortSignal,
  modelId: VoiceCallModelId
): AsyncIterable<string> {
  const model = createPracticeModel(modelId);
  const system = buildCustomerSystemPrompt(scenario);
  const messages = toModelMessages(transcript);

  const result = streamText({
    model,
    system,
    messages,
    abortSignal,
    maxRetries: 1,
    providerOptions: PROVIDER_OPTIONS
  });

  return result.textStream;
}

function formatTranscript(transcript: TPracticeTurn[]): string {
  return transcript.map((turn) => `${turn.speaker === 'agent' ? 'Nhân viên' : 'Khách hàng'}: ${turn.text}`).join('\n');
}

const DEFAULT_CRITERIA = `- Chào hỏi và xác nhận thông tin khách hàng
- Lắng nghe, đồng cảm, kiểm soát cảm xúc khách
- Khai thác đúng nhu cầu / nguyên nhân
- Giải pháp rõ ràng, chính xác, dễ hiểu (không dùng thuật ngữ khó)
- Cam kết và kết thúc cuộc gọi chuyên nghiệp`;

/** Grades a finished call against the scenario's objective and criteria. */
export async function evaluatePracticeCall(
  scenario: TPracticeScenario,
  transcript: TPracticeTurn[],
  modelId: VoiceCallModelId
): Promise<TPracticeFeedback> {
  const model = createPracticeModel(modelId);
  const criteria = scenario.evaluationCriteria.trim() || DEFAULT_CRITERIA;

  const prompt = `## Tình huống
${scenario.title}
Khách hàng: ${scenario.customerName}${optionalSection('Kịch bản', scenario.persona)}${optionalSection('Thông tin ẩn của khách', scenario.hiddenContext)}${optionalSection('Mục tiêu của nhân viên', scenario.objective)}${optionalSection('Gợi ý cho nhân viên', scenario.tip)}

## Tiêu chí chấm
${criteria}

## Nội dung cuộc gọi
${formatTranscript(transcript)}`;

  const { object } = await generateObject({
    model,
    schema: ZPracticeFeedback,
    system:
      'Bạn là chuyên gia đào tạo chăm sóc khách hàng qua điện thoại. Hãy chấm cuộc gọi luyện tập của NHÂN VIÊN (không chấm khách hàng) theo từng tiêu chí được cho, công bằng và cụ thể, dẫn chứng câu nói trong cuộc gọi. Lời nhân viên được chuyển từ giọng nói nên bỏ qua lỗi chính tả. Cuộc gọi quá ngắn hoặc chưa xử lý xong vấn đề thì điểm thấp. Viết bằng tiếng Việt, xưng "bạn" với nhân viên.',
    prompt,
    maxRetries: 1,
    providerOptions: PROVIDER_OPTIONS
  });

  return object;
}
