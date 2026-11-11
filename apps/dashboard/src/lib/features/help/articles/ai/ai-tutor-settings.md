---
title: Cài đặt trợ giảng AI
description: Đặt giọng điệu, quy tắc và cách hỗ trợ bài tập của trợ giảng AI cho cả tổ chức, rồi chỉnh riêng cho từng khóa nếu cần.
order: 4
audience: Admin, L&D
---

Trợ giảng AI có một bộ cài đặt mặc định cho cả tổ chức. Từng khóa học có thể dùng theo mặc định đó, hoặc thiết lập riêng.

## Cài đặt cho cả tổ chức

Admin mở **Cài đặt** → nhóm **Bảo mật & AI** → **Trợ giảng AI** (`/settings/ai-tutor`). Trang có tên **Cài đặt trợ giảng AI**. Mục này chỉ hiện khi AI đang bật cho tổ chức.

Chỉnh các phần dưới đây rồi bấm **Lưu thay đổi**. Bấm **Bỏ thay đổi** để quay về giá trị đã lưu.

> **Lưu ý:** Chỉ Admin lưu được cài đặt của tổ chức. L&D chỉnh trợ giảng cho từng khóa (xem phần dưới).

### Trạng thái bật/tắt

**Bật trợ giảng AI**: tắt thì học viên không dùng được trợ giảng ở mọi khóa đang dùng mặc định của tổ chức.

### Tính cách

- **Phong cách trợ giảng**: **Khích lệ** (mặc định), **Thân thiện**, **Trang trọng**, **Gợi mở (Socrates)** hoặc **Tùy chỉnh**. Chọn **Tùy chỉnh** để tự mô tả giọng điệu trong ô **Phong cách tùy chỉnh**.
- **Độ dài câu trả lời**: **Ngắn (1–3 câu)**, **Vừa (1–2 đoạn ngắn)** (mặc định) hoặc **Dài (giải thích có cấu trúc)**.
- **Lời chào**: hiện phía trên câu trả lời đầu tiên của mỗi cuộc trò chuyện mới.
- **Ghi chú cuối câu trả lời**: thêm vào cuối mỗi câu trả lời để học viên nhớ trợ giảng không phải người thật. Mặc định là "Mình là trợ giảng AI, không thay thế bộ phận đào tạo." Trợ giảng trả lời bằng tiếng Việt, trừ khi học viên viết bằng ngôn ngữ khác.

### Nên nói · không nên nói

- **Nên nói** và **Không nên nói**: hướng dẫn tự do, ví dụ "Không tiết lộ đáp án bài kiểm tra cuối khóa."
- **Chủ đề cấm**: danh sách cách nhau bằng dấu phẩy, tối đa 20 chủ đề. Trợ giảng từ chối các chủ đề này.
- **Chặn câu hỏi lạc đề** và **Lọc ngôn từ thô tục và nội dung nhạy cảm**: mặc định đều bật.

### Bài tập và đánh giá

- **Chế độ hỗ trợ bài tập**:
  - **Chỉ gợi ý (không đưa đáp án)** (mặc định): trợ giảng dẫn dắt bằng câu hỏi.
  - **Cho phép đưa đáp án**.
  - **Không hỗ trợ khi học viên đang làm bài tập**.
- **Hiện lời giải sau N lượt làm bài**: ở chế độ chỉ gợi ý, sau số lượt này trợ giảng được đưa ví dụ có lời giải. Mặc định 3.
- **Chính sách về mã**: **Chỉ gợi ý**, **Cho phép ví dụ mã đầy đủ** hoặc **Không đưa mã vào câu trả lời**.

### Phạm vi kiến thức và trích dẫn

- **Phạm vi kiến thức**: **Chỉ bài học hiện tại** hoặc **Toàn bộ khóa học** (mặc định).
- **Bắt buộc trích dẫn tài liệu khóa học**: trợ giảng ghi tên bài học hoặc bài tập đã dùng để trả lời, kèm liên kết bấm được.

> **Lưu ý:** Lựa chọn **Toàn bộ không gian làm việc** hiện hoạt động giống **Toàn bộ khóa học**. Trợ giảng luôn chỉ đọc khóa học mà học viên đang mở.

### Chuyển cho người hỗ trợ

Bật **Cho phép chuyển cho người hỗ trợ** và nhập **Email liên hệ bộ phận đào tạo**. Khi không giúp được, trợ giảng gợi ý học viên gửi email đến địa chỉ này.

## Cài đặt riêng cho một khóa

1. Mở khóa học, chọn **Trợ giảng AI** ở thanh bên của khóa. Trang có tên **Trợ giảng AI cho khóa học này**.
2. Ở phần **Kế thừa cho khóa học**, tắt **Dùng mặc định của không gian làm việc**.
3. Bộ cài đặt đầy đủ hiện ra, điền sẵn giá trị đang áp dụng. Chỉnh những gì cần, ví dụ tắt **Bật trợ giảng AI** cho một khóa thi.
4. Bấm **Lưu thay đổi**.

Admin và L&D có quyền soạn khóa đều chỉnh được trang này.

Muốn khóa quay lại theo tổ chức, bật lại **Dùng mặc định của không gian làm việc** rồi lưu. Khi đang kế thừa, mọi thay đổi sau này ở trang của tổ chức tự áp dụng cho khóa.

> **Mẹo:** Khi một khóa đã thiết lập riêng, thay đổi ở trang của tổ chức không còn tác động đến khóa đó. Hãy kiểm tra các khóa thiết lập riêng mỗi khi đổi chính sách chung.

## Hạn mức không nằm ở đây

Số tin nhắn mỗi học viên và hạn mức AI của tổ chức được đặt ở trang **AI**. Xem [Bật, tắt AI và hạn mức](/help/ai/ai-switch-and-limits). Học viên thấy gì: [Trợ giảng AI cho học viên](/help/ai/learner-ai-tutor).
