---
title: Soạn khóa học bằng AI
description: Mô tả khóa học, đính kèm tài liệu nội bộ và để AI lập kế hoạch rồi tạo chương, bài học, bài tập.
order: 1
audience: L&D, Admin
---

Trang **Soạn khóa học AI** biến một đoạn mô tả, kèm tài liệu nếu có, thành một khóa học mới. AI lập kế hoạch trước, bạn duyệt, rồi AI mới tạo nội dung.

## Ai dùng được

Admin và L&D. Mục **Soạn khóa học AI** nằm ở thanh bên, mở trang `/studio`. Khi AI đang tắt cho tổ chức, mục này không hiện và đường dẫn `/studio` tự chuyển về trang tổng quan. Xem [Bật, tắt AI và hạn mức](/help/ai/ai-switch-and-limits).

## Mô tả khóa học

1. Mở **Soạn khóa học AI**. Trang hỏi **Bạn muốn tạo khóa học gì?**
2. Gõ mô tả vào ô **Mô tả khóa học bạn muốn MP Learning tạo giúp...**: chủ đề, đối tượng học viên, những việc học viên cần làm được sau khóa.
3. Chọn trình độ: **Cơ bản**, **Trung cấp** hoặc **Nâng cao**.
4. Chọn mô hình AI ở ô bên cạnh. Mặc định là Gemini 3.1 Flash Lite. Mô hình đánh dấu `$$$` tốn nhiều đơn vị AI hơn mô hình đánh dấu `$`. Lựa chọn được nhớ cho lần sau.
5. Bấm nút mũi tên hoặc nhấn Enter để gửi.

> **Lưu ý:** Nếu máy chủ chưa cấu hình nhà cung cấp của mô hình bạn chọn, yêu cầu sẽ báo lỗi. Hãy chọn mô hình khác hoặc báo đội vận hành.

## Đính kèm tài liệu

Bấm biểu tượng kẹp giấy để đính kèm quy trình, chính sách, slide… AI sẽ soạn khóa học dựa trên các tệp này.

- Định dạng: PDF, Word (.docx), PowerPoint (.pptx), OpenDocument (.odt).
- Tối đa **5 tệp** cho một yêu cầu, mỗi tệp tối đa 5 MB (đội vận hành có thể đổi giới hạn dung lượng).
- Mỗi tệp hiện thành một thẻ nhỏ dưới ô mô tả; bấm dấu X để bỏ tệp.
- Chọn quá 5 tệp, trang báo **Mỗi lần chỉ đính kèm được tối đa 5 tệp.** và chỉ giữ 5 tệp đầu.

> **Lưu ý:** AI chỉ đọc phần chữ của tài liệu, tối đa khoảng 40.000 ký tự mỗi lượt. Tài liệu quá dài sẽ bị cắt bớt; hãy tách thành nhiều tệp ngắn hơn.

## Từ yêu cầu đến khóa học

1. Sau khi gửi, trang hiện **Đang phác thảo ý tưởng khóa học**. MP Learning tạo một khóa học mới (AI đặt tên và mô tả) rồi mở trang bài học của khóa, kèm khung **Trợ lý AI** bên phải. Tệp đính kèm được tải lên và yêu cầu của bạn được gửi tự động.
2. Trợ lý trả về một thẻ kế hoạch: số chương, bài học, bài tập, và ước tính số token cùng phần trăm hạn mức AI sẽ dùng. Bấm **Mở rộng kế hoạch** để xem từng chương.
3. Muốn sửa kế hoạch, gõ vào ô **Cho tôi biết bạn muốn thay đổi gì trong kế hoạch…** và gửi. Trợ lý gửi lại kế hoạch mới.
4. Khi kế hoạch đã ổn, bấm **Thực hiện kế hoạch**. Trợ lý tạo chương, bài học và bài tập ở chế độ nền, khung chat hiện **Đang tạo khóa học** và từng bước đang làm.
5. Khi xong, khung chat báo **Đã tạo xong khóa học**. Kiểm tra lại nội dung trước khi xuất bản.

Trong lúc tạo, ô chat tạm khóa. Bạn có thể bấm **Hủy tạo khóa học**. Nội dung đã tạo vẫn được giữ; bấm **Tiếp tục** để làm tiếp từ chỗ dừng, hoặc **Thử lại** nếu lượt tạo không thành công.

> **Mẹo:** AI chưa tạo gì cho đến khi bạn bấm **Thực hiện kế hoạch**. Sửa kế hoạch ở bước này rẻ hơn nhiều so với sửa từng bài học sau đó.

## Bài học "Tài liệu tham khảo"

Khi bạn có đính kèm tài liệu, trợ lý tạo một bài học tên **Tài liệu tham khảo** ở đầu chương đầu tiên. Bài này không có nội dung chữ; các tệp gốc được gắn vào đó làm tài liệu tải về, để học viên đọc lại bản đầy đủ.

## Bắt đầu từ gợi ý

Dưới ô mô tả có mục **Hoặc bắt đầu từ gợi ý** với ba thẻ: **Khóa học nhập môn sản phẩm**, **Đào tạo hội nhập sản phẩm** và **Trở thành chuyên gia về X**.

1. Bấm một thẻ. Ô mô tả được điền sẵn một câu mẫu.
2. Gửi như bình thường. Trong khung **Trợ lý AI**, trợ lý hiện một biểu mẫu ngắn (ví dụ **Tên sản phẩm**, **Đối tượng học viên là ai?**, **URL tài liệu (không bắt buộc)**).
3. Điền rồi bấm **Tiếp tục**, hoặc bấm **Trả lời qua trò chuyện** để trả lời bằng tin nhắn.

Mục **Hoặc bắt đầu từ mẫu** bên dưới là các mẫu khóa học có sẵn bài học và bài tập, không dùng AI. Bấm **Xem tất cả mẫu** để mở thư viện mẫu.

Chỉnh từng bài sau khi tạo: xem [Trợ lý AI trong khóa học](/help/ai/course-ai-assistant).
