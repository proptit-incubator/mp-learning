import { generateObject } from 'ai';
import {
  ZPracticeScenarioAssistantReply,
  type TPracticeScenarioAssistantReply,
  type TPracticeScenarioAssistantRequest
} from '@cio/utils/validation/practice';

import { AppError, ErrorCodes } from '@api/utils/errors';
import { getPracticeAiSettings } from './ai-settings';
import { createPracticeModel, PROVIDER_OPTIONS } from './customer-agent';

const ASSISTANT_SYSTEM_PROMPT = `Bạn là trợ lý giúp chuyên viên đào tạo (L&D) của tổng đài soạn TÌNH HUỐNG LUYỆN GỌI. Trong buổi luyện, một AI sẽ đóng vai khách hàng theo tình huống này và nhân viên tổng đài sẽ nói chuyện với nó.

Mỗi lượt bạn nhận yêu cầu của người soạn và bản nháp hiện tại, rồi trả về:
- reply: câu trả lời ngắn bằng tiếng Việt (2–4 câu) nói bạn vừa điền/sửa gì. Khi nhắc độ khó, viết "dễ", "trung bình" hoặc "khó", không viết mã EASY/MEDIUM/HARD. Nếu còn thiếu thông tin quan trọng (sản phẩm/dịch vụ, vấn đề cụ thể của khách, mức độ khó) thì hỏi thêm đúng 1 câu.
- draft: bản nháp ĐẦY ĐỦ sau khi cập nhật.

Quy tắc cập nhật bản nháp:
- Chỉ đổi những phần người soạn yêu cầu, hoặc những ô đang trống. Giữ nguyên các ô đã có nội dung khi không được yêu cầu sửa.
- Khi người soạn mô tả một tình huống mới, hãy điền toàn bộ các ô hợp lý, cụ thể, sát thực tế tổng đài Việt Nam (số tiền, thời gian, mã đơn, tên gói…).
- title: tên ngắn gọn, nêu rõ vấn đề của khách. summary: 1–2 câu cho học viên đọc trước khi gọi. topic: 1–3 từ (VD: Cước phí, Hủy dịch vụ, Telesale).
- difficulty: EASY (khách hợp tác), MEDIUM (khách băn khoăn/hơi khó chịu), HARD (khách bức xúc, hay phản bác).
- customerName: cách gọi khách, VD "Chị Hạnh", "Anh Tuấn", "Cô Thoa".
- persona: kịch bản nhập vai cho AI khách hàng — tính cách, hoàn cảnh, cảm xúc, khách muốn gì, khi nào khách dịu lại hay gay gắt hơn. Viết ở ngôi thứ hai ("Bạn là…").
- hiddenContext: sự thật chỉ khách biết, nhân viên phải khai thác mới ra (VD: khách vừa đi nước ngoài, đã gọi 2 lần trước).
- openingLine: câu đầu tiên khách nói khi cuộc gọi kết nối. Nói như khách thật gọi lên tổng đài: bắt đầu bằng "Alo", đi thẳng vào việc, KHÔNG dùng "Dạ", "Vâng", không thêm "ạ" (trừ khách lớn tuổi lễ phép).
- objective: điều nhân viên cần đạt được. tip: 1 gợi ý ngắn cho nhân viên.
- evaluationCriteria: 4–6 dòng, mỗi dòng bắt đầu bằng "- ", là tiêu chí chấm điểm cụ thể cho tình huống này.
- Không dùng markdown trong các ô. Không bịa thêm trường ngoài danh sách.`;

function formatDraft(draft: TPracticeScenarioAssistantRequest['draft']): string {
  return JSON.stringify(draft, null, 2);
}

/** Drafts or revises a practice scenario from the author's chat request. */
export async function runScenarioAssistant(
  orgId: string,
  request: TPracticeScenarioAssistantRequest
): Promise<TPracticeScenarioAssistantReply> {
  const { adminAssistantModel } = await getPracticeAiSettings(orgId);
  const model = createPracticeModel(adminAssistantModel);
  const lastIndex = request.messages.length - 1;
  const messages = request.messages.map((message, index) =>
    index === lastIndex && message.role === 'user'
      ? { role: message.role, content: `${message.content}\n\n## Bản nháp hiện tại\n${formatDraft(request.draft)}` }
      : message
  );

  try {
    const { object } = await generateObject({
      model,
      schema: ZPracticeScenarioAssistantReply,
      system: ASSISTANT_SYSTEM_PROMPT,
      messages,
      maxRetries: 1,
      providerOptions: PROVIDER_OPTIONS
    });

    return object;
  } catch (error) {
    console.error('practice scenario assistant failed:', error);
    throw new AppError('Scenario assistant failed', ErrorCodes.PRACTICE_ASSISTANT_FAILED, 502);
  }
}
