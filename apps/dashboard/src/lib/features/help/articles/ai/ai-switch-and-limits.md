---
title: Bật, tắt AI và hạn mức
description: Bật hoặc tắt AI cho cả tổ chức, đặt hạn mức hằng tháng và theo dõi ai đang dùng bao nhiêu.
order: 5
audience: Admin
---

Trang **AI** là nơi Admin quyết định tổ chức có dùng AI hay không, và dùng tối đa bao nhiêu mỗi tháng. Mở **Cài đặt** → nhóm **Bảo mật & AI** → **AI** (`/settings/ai`).

## Máy chủ phải có AI trước

AI chỉ chạy khi máy chủ có khóa API của ít nhất một nhà cung cấp AI và không đặt biến môi trường `AI_ENABLED=false`. Nếu thiếu, trang hiện **Máy chủ chưa có AI**, mọi ô trên trang bị khóa, và bạn cần đội vận hành cấu hình máy chủ trước.

Khi máy chủ chưa có AI, mục **AI** cũng không hiện trong thanh bên cài đặt.

## Bật hoặc tắt AI cho tổ chức

Ở phần **Trạng thái**, gạt **Cho phép dùng AI** rồi bấm **Lưu thay đổi**.

Khi tắt:

- Mọi tính năng AI biến mất khỏi giao diện: **Soạn khóa học AI**, khung **Trợ lý AI**, ô **Hỏi AI**, trang **Trợ giảng AI**.
- Máy chủ từ chối mọi yêu cầu AI, kể cả khi ai đó gọi thẳng API.
- Lịch sử trò chuyện và số liệu mức dùng vẫn được giữ. Bật lại là dùng tiếp.

## Hạn mức hằng tháng

Mức dùng tính bằng **đơn vị AI**: 1 đơn vị bằng 1 token của mô hình rẻ nhất; mô hình đắt hơn tính nhiều đơn vị hơn cho cùng một lượng chữ. Mọi hạn mức đặt lại vào ngày 1 hằng tháng.

| Ô | Mặc định | Ý nghĩa |
|---|---|---|
| **Hạn mức của cả tổ chức (triệu đơn vị)** | 15 | Tổng cho mọi người, gồm cả trợ giảng của học viên. Dòng gợi ý dưới ô cho biết chi phí ước tính bằng USD |
| **Hạn mức mỗi người soạn bài (triệu đơn vị)** | 3 | Mức tối đa của mỗi người dùng AI để soạn nội dung (L&D, Admin) |
| **Số tin nhắn trợ giảng AI mỗi học viên** | 100 | Số câu hỏi một học viên được gửi trợ giảng mỗi tháng. Đặt 0 để học viên không dùng trợ giảng |

- Các ô hạn mức nhận bước 0,5 triệu, tối đa 1.000 triệu.
- Chọn **Không đặt hạn mức riêng cho từng người** để người soạn bài chỉ bị giới hạn bởi hạn mức chung.
- Chi phí ước tính tính theo khoảng 0,50 USD cho mỗi triệu đơn vị. Đây là con số tham khảo, không phải hóa đơn của nhà cung cấp.

> **Mẹo:** Hạn mức mỗi người giúp một người soạn cả loạt khóa dài không dùng hết phần của mọi người. Thử để 3 triệu và theo dõi bảng **Theo người** trong vài tuần trước khi đổi.

## Theo dõi mức dùng

Phần **Mức dùng tháng này** gồm:

- **Đã dùng / hạn mức**: số đơn vị đã dùng của cả tổ chức, thanh tiến độ và dòng **Đã dùng …% · đặt lại ngày …**. Thanh chuyển vàng khi vượt 70% và đỏ khi vượt 90%.
- **Chi phí ước tính**: quy đổi số đã dùng ra USD, kèm số yêu cầu AI trong tháng.
- Biểu đồ **Theo ngày**: số đơn vị AI đã dùng mỗi ngày trong tháng.
- Bảng **Theo người**: mỗi người dùng AI trong tháng, **Mô hình dùng nhiều nhất** và cột **Đã dùng**. Khi có hạn mức mỗi người, cột này hiện thêm hạn mức và thanh chuyển đỏ khi người đó chạm mức.

## Người dùng thấy gì khi hết hạn mức

| Tình huống | Thông báo |
|---|---|
| Cả tổ chức hết hạn mức | Khung **Trợ lý AI** hiện **Tổ chức đã dùng hết hạn mức AI của tháng này.** |
| Một người soạn bài hết phần của mình | **Bạn đã dùng hết hạn mức AI cá nhân của tháng này.** |
| Học viên hết lượt tin nhắn | **Trợ giảng AI đang tạm nghỉ** · **Bạn đã dùng hết số tin nhắn với trợ giảng trong tháng này…** |
| Học viên, khi tổ chức hết hạn mức | **Trợ giảng AI đang tạm nghỉ** · **Tổ chức đã dùng hết hạn mức trợ giảng AI của tháng này…** |
| AI đang tắt | **AI đang tắt cho tổ chức này.** |

Admin thấy thêm nút **Xem hạn mức** để mở thẳng trang này. AI dùng lại được ngay khi Admin nâng hạn mức, hoặc từ ngày 1 tháng sau.

> **Lưu ý:** Một yêu cầu đang chạy vẫn được làm xong, nên mức dùng có thể vượt hạn mức một chút. Hạn mức chặn từ yêu cầu tiếp theo.

## Xem thêm

- [Soạn khóa học bằng AI](/help/ai/ai-course-studio)
- [Cài đặt trợ giảng AI](/help/ai/ai-tutor-settings)
