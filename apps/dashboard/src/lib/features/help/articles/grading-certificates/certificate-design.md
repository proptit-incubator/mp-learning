---
title: Thiết kế chứng chỉ
description: Chọn mẫu, màu nhấn, người ký và chữ ký cho chứng chỉ của một khóa học, rồi cho học viên tải chứng chỉ.
order: 3
audience: L&D, Admin
---

Mỗi khóa học có một thiết kế chứng chỉ riêng. Bạn chọn mẫu, màu nhấn, người ký và quyết định học viên có được tải chứng chỉ hay không. Chỉ Admin và L&D chỉnh được phần này.

## Mở trang chứng chỉ

1. Mở khóa học, chọn **Chứng chỉ** trong thanh bên.
2. Tab **Thiết kế** hiện bản xem trước và khung **Thiết kế đang dùng** với **Mẫu**, **Màu nhấn** và **Người ký** hiện tại.
3. Bấm **Tùy chỉnh thiết kế** để mở trình chỉnh sửa.

Khóa mới dùng sẵn mẫu **MP Transformation**, màu nhấn xanh của MP và hai người ký mặc định là "Trưởng phòng Đào tạo" và "Tổng Giám đốc".

## Chỉnh trong trình thiết kế

Trình chỉnh sửa có bốn mục ở cột bên trái. Bản **Xem trước trực tiếp** cập nhật ngay khi bạn sửa.

- **Mẫu**: chọn một trong sáu mẫu: MP Transformation, Classique, Brutalist, Noir, Poster, Minimal.
- **Nội dung**:
  - **Tiêu đề phụ**: dòng nhỏ dưới tiêu đề, mặc định là "Hoàn thành khóa đào tạo".
  - **Mô tả thay thế**: để trống thì chứng chỉ dùng mô tả của khóa học.
  - **Người ký**: bật **Hiện người ký 1** hoặc **Hiện người ký 2**, rồi nhập tên và chức danh. Ở mục **Ảnh chữ ký**, tải ảnh chữ ký lên nếu muốn. Ảnh này không bắt buộc.
  - **Định dạng mã chứng chỉ**: cách in mã trên chứng chỉ. `{seq}` là mã chứng chỉ 10 ký tự. Bạn có thể thêm `{year}`, `{month}` và `{day}` (năm, tháng và ngày cấp).
- **Màu nhấn**: chọn một trong sáu màu. Màu này dùng cho đường kẻ dưới tên người nhận, con dấu và tiêu đề nổi bật.
- **Xuất**: **Tải PDF**, **Tải PNG** hoặc **In** bản xem thử. Bản này dùng tên của bạn làm người nhận.

Bấm **Lưu thay đổi** ở góc trên để lưu, hoặc **Bỏ thay đổi** để quay về bản đã lưu. Nếu ảnh chữ ký chưa tải xong, hệ thống nhắc **Vui lòng đợi tải ảnh chữ ký xong rồi mới lưu.** Bấm **Quay lại chứng chỉ** để về trang chứng chỉ.

> **Lưu ý:** Chỉ mẫu **MP Transformation** in đủ mã nhân viên, ngày "Hiệu lực đến" (khi khóa có học lại định kỳ) và dòng "Tra cứu tại" kèm đường dẫn xác minh. Các mẫu khác chỉ in tên người nhận, tên khóa, tên tổ chức và mã chứng chỉ. Hãy dùng mẫu MP Transformation cho chứng chỉ cần kiểm tra được.

> **Mẹo:** Giữ `{seq}` trong định dạng mã. Trang tra cứu tìm theo mã 10 ký tự, nên người kiểm tra cần thấy đúng mã đó trên chứng chỉ.

## Cho học viên tải chứng chỉ

1. Trên trang **Chứng chỉ**, chọn tab **Cài đặt**.
2. Bật **Cho phép học viên tải chứng chỉ**.
3. Nếu muốn, nhập **Nội dung email**. Đây là lời nhắn kèm theo email chúc mừng khi học viên hoàn thành khóa.
4. Bấm **Lưu thay đổi**.

Khi mục này tắt, học viên mở tab **Chứng chỉ** chỉ thấy **Chưa có chứng chỉ** và lời nhắn liên hệ bộ phận đào tạo. Chứng chỉ vẫn được cấp và ghi vào sổ chứng chỉ khi học viên hoàn thành khóa.

Tab **Cài đặt** cũng tóm tắt **Quy tắc hoàn thành** của khóa. Xem [Điều kiện cấp chứng chỉ](/help/grading-certificates/certificate-eligibility).
