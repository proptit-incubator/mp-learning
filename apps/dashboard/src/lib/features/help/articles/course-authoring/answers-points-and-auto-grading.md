---
title: Đáp án, điểm và chấm tự động
description: Cách đặt điểm cho từng câu hỏi, khai báo đáp án đúng và cách hệ thống tự chấm khi học viên nộp bài.
order: 9
audience: L&D, Admin
---

Với câu hỏi nhóm tự động, hệ thống so câu trả lời của học viên với đáp án bạn khai báo và cho điểm ngay khi học viên nộp bài. Bài viết này giải thích cách đặt điểm, khai báo đáp án và cách tính điểm.

## Đặt điểm cho câu hỏi

Mỗi thẻ câu hỏi có ô **Điểm**. Tổng điểm của bài tập là tổng điểm các câu.

- Khi để điểm bằng 0, thẻ hiện cảnh báo: câu đó sẽ không được tính điểm cho học viên.
- Nếu mọi câu trong bài đều thuộc nhóm tự động, bạn không lưu được bài tập khi còn câu có điểm bằng 0. Hệ thống báo **Bài tập chấm tự động phải có điểm lớn hơn 0.** ngay trên câu đó.

## Khai báo đáp án đúng

- **Một đáp án**: nhấn biểu tượng cạnh lựa chọn đúng (**Đánh dấu là đáp án đúng**). Chỉ chọn một đáp án.
- **Nhiều đáp án**: bật mọi lựa chọn đúng. Dùng **Thêm lựa chọn** để thêm lựa chọn.
- **Đúng/Sai**: chọn **Đáp án đúng**.
- **Trả lời bằng số**: nhập **Giá trị đúng** và **Sai số cho phép**. Ví dụ sai số 0.5 nghĩa là chấp nhận chênh lệch cộng trừ 0.5.
- **Điền vào chỗ trống**: nhập **Đáp án được chấp nhận**, phân tách bằng dấu phẩy, theo thứ tự các chỗ trống.
- **Điền từ cho sẵn**: viết **Mẫu câu**, dùng ba dấu gạch dưới `___` cho mỗi chỗ trống. Điền **Đáp án đúng cho từng chỗ trống**, rồi thêm **Từ bổ sung (từ gây nhiễu)** bằng **Thêm từ gây nhiễu**.
- **Sắp xếp thứ tự**: thêm các bước rồi kéo để xếp theo thứ tự đúng. Học viên thấy các bước bị xáo trộn.
- **Đánh giá sao**: chọn **Số sao đúng**.

## Cách tính điểm

- **Một đáp án**, **Đúng/Sai**, **Trả lời bằng số**, **Đánh giá sao**: đúng thì được đủ điểm của câu, sai thì 0 điểm.
- **Nhiều đáp án**: được điểm từng phần. Mỗi lựa chọn đúng được chọn cộng điểm, mỗi lựa chọn sai bị chọn trừ điểm. Điểm thấp nhất là 0.
- **Điền vào chỗ trống**, **Điền từ cho sẵn**, **Sắp xếp thứ tự**: được điểm theo tỉ lệ số chỗ trống hoặc số vị trí đúng.
- Điền vào chỗ trống và điền từ không phân biệt chữ hoa, chữ thường và bỏ qua khoảng trắng ở hai đầu.
- Điểm của từng câu được làm tròn về số nguyên.

## Khi nào bài được chấm tự động

Cạnh tiêu đề bài tập có nhãn cho biết cách chấm:

- **Chấm tự động**: mọi câu thuộc nhóm tự động. Học viên nộp xong là có điểm và trạng thái **Đã chấm điểm**.
- **Cần chấm thủ công**: có ít nhất một câu cần người chấm. Cả bài nộp ở trạng thái **Đang chờ chấm** cho tới khi được chấm xong. Xem [Chấm bài và chứng chỉ](/help/grading-certificates).

> **Lưu ý:** Nếu bài tập dùng quy tắc hoàn thành **Đạt**, điểm phần trăm của học viên được so với **Ngưỡng đạt (%)**. Bài cần chấm thủ công chỉ được tính là đạt sau khi chấm xong. Xem [Điều kiện hoàn thành và số lần làm](/help/course-authoring/completion-rules-and-attempts).

## Học viên có thấy đáp án không

Học viên có thấy câu nào đúng, câu nào sai hay không phụ thuộc vào cài đặt **Hiện đáp án đúng** của bài tập. Khi đáp án còn ẩn, học viên chỉ thấy điểm. Cách đặt: [Điều kiện hoàn thành và số lần làm](/help/course-authoring/completion-rules-and-attempts).
