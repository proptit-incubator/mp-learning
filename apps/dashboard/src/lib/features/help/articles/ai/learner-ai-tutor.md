---
title: Trợ giảng AI cho học viên
description: Trợ giảng AI giúp học viên hiểu bài trong khóa của mình, và những gì trợ giảng được hay không được xem.
order: 3
audience: Học viên, L&D, Admin
---

Trợ giảng AI trả lời câu hỏi của học viên về khóa học đang học: giải thích bài, tóm tắt, ra câu hỏi tự kiểm tra, xem lại bài nộp. Trợ giảng chỉ đọc, không sửa được nội dung khóa.

## Mở trợ giảng

- Trong khóa học, bấm nút **Trợ lý AI** ở thanh trên cùng.
- Hoặc gõ vào ô **Hỏi AI** nổi ở cuối trang bài học hoặc bài tập.

Khi khung chat còn trống, học viên có các gợi ý: **Giải thích bài học này**, **Kiểm tra tôi về nội dung này**, **Tóm tắt chương này**, **Tôi nên ôn lại phần nào tiếp theo?**

Học viên không chọn được mô hình AI và không đính kèm tệp. Trợ giảng luôn dùng mô hình mặc định của hệ thống.

## Trợ giảng thấy gì

Trợ giảng chỉ mở những gì học viên tự mở được:

- **Chỉ khóa học của học viên**: khóa được giao hoặc học viên đã tự đăng ký. Hỏi trong khóa khác, trợ giảng báo **Bạn chưa được giao khóa học này nên chưa dùng được trợ giảng AI.**
- **Chỉ khóa đã xuất bản**: khóa còn ở dạng nháp không dùng được trợ giảng.
- **Chỉ nội dung đã mở**: bài học hoặc bài tập còn khóa (chưa tới lượt theo thứ tự học, hoặc đang bị khóa) thì trợ giảng không đọc được, và báo **Nội dung này chưa được mở cho bạn, nên trợ giảng AI chưa thể đọc.** Kết quả tìm kiếm trong khóa cũng bỏ qua các mục chưa mở.
- **Bài nộp của chính học viên**: điểm, câu sai, nhận xét của người chấm. Trợ giảng không bao giờ xem bài của học viên khác.

Trợ giảng biết dàn ý của khóa (tên chương, bài học, bài tập) để gợi ý học viên nên đọc bài nào.

## Đáp án vẫn được giữ kín

- Khi đọc bài tập, trợ giảng chỉ thấy đề và các lựa chọn. Đáp án đúng và thang điểm bị bỏ đi trước khi đưa cho AI.
- Khi xem bài nộp, kết quả đúng, sai và điểm của từng câu chỉ hiện khi bài tập đã cho phép xem đáp án. Trước đó trợ giảng chỉ thấy câu trả lời học viên đã chọn, tổng điểm và nhận xét (nếu bài đã chấm), nên làm lại nhiều lần cũng không dò ra được đáp án.
- Theo mặc định, trợ giảng chỉ gợi ý chứ không đưa thẳng đáp án. L&D đổi cách này trong [Cài đặt trợ giảng AI](/help/ai/ai-tutor-settings).

## Hạn mức tin nhắn hằng tháng

Mỗi học viên được gửi một số câu hỏi cho trợ giảng mỗi tháng, mặc định **100**. Thanh dưới tiêu đề khung chat cho biết đã dùng bao nhiêu, ví dụ `12 / 100 tin nhắn trong tháng`. Hạn mức đặt lại vào ngày 1 hằng tháng.

Khi trợ giảng không trả lời được, khung chat hiện **Trợ giảng AI đang tạm nghỉ** kèm lý do:

| Thông báo | Nghĩa là |
|---|---|
| **Bạn đã dùng hết số tin nhắn với trợ giảng trong tháng này…** | Học viên đã hết lượt của tháng |
| **Tổ chức đã dùng hết hạn mức trợ giảng AI của tháng này…** | Cả tổ chức đã hết hạn mức AI |
| **Trợ giảng AI chưa được bật cho không gian làm việc này.** | Trợ giảng đang tắt cho tổ chức hoặc cho khóa này |

> **Lưu ý:** Admin đặt số tin nhắn mỗi học viên ở trang **AI**. Đặt 0 nghĩa là học viên không dùng trợ giảng. Xem [Bật, tắt AI và hạn mức](/help/ai/ai-switch-and-limits).

## Khi nào nên hỏi người thật

Trợ giảng có thể trả lời sai. Nếu tổ chức bật **Cho phép chuyển cho người hỗ trợ**, trợ giảng sẽ gợi ý học viên email đến bộ phận đào tạo khi không giúp được.
