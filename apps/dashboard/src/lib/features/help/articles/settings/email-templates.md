---
title: Mẫu email cho nhân viên
description: Sửa tiêu đề và nội dung các email MP Learning gửi cho nhân viên, xem trước và gửi thử.
order: 4
audience: Admin
---

Trang **Mẫu email cho nhân viên** cho Admin sửa lời văn của các email gửi tới nhân viên, như thư kích hoạt tài khoản, thư báo được giao khóa hay thư nhắc hạn. Nút hành động, đường dẫn đích, logo và chân trang do hệ thống giữ cố định.

## Mở trang

1. Trong trang quản trị, chọn **Cài đặt** ở thanh bên.
2. Trong nhóm **Cài đặt hệ thống**, chọn **Email**.

Địa chỉ trang là `/settings/emails`.

## Các mẫu có thể sửa

- **Tài khoản và ghi danh**: **Kích hoạt tài khoản nhân viên**, **Cấp quyền truy cập khóa học**, **Nhắc hạn hoàn thành khóa được giao**.
- **Học tập**: **Đã giao bài tập**, **Bài nộp đã được chấm**, **Đến kỳ học lại**, **Hoàn thành khóa học**.
- **Buổi học trực tuyến**: **Nhắc lịch buổi học trực tuyến**, **Buổi học trực tuyến đã cập nhật**.
- **Cập nhật**: **Bài đăng trên bảng tin khóa học**.

Mẫu bạn đã sửa có chữ **Đã sửa** bên cạnh tên.

## Sửa một mẫu

1. Chọn mẫu ở cột trái. Trên màn hình hẹp, chọn trong ô **Email**.
2. Sửa **Tiêu đề**.
3. Sửa phần **Nội dung email** trong trình soạn thảo.
4. Để chèn dữ liệu riêng của từng người, bấm một biến ở dòng **Chèn**, ví dụ **Tên nhân viên**, **Tên khóa học** hay **Ngày hết hạn**. Biến hiện dưới dạng `{{tên_biến}}` và được thay bằng giá trị thật khi gửi.
5. Bấm **+ Liên kết** để chèn liên kết động của mẫu, như liên kết kích hoạt hay liên kết vào khóa học.
6. Bấm **Xem trước** để xem email hoàn chỉnh, rồi **Chỉnh sửa** để quay lại.
7. Bấm **Lưu thay đổi** ở thanh dưới trang.

Khi còn thay đổi chưa lưu, bạn không chuyển được sang mẫu khác. Hãy lưu hoặc bấm **Bỏ thay đổi** trước.

## Gửi thử

1. Bấm **Gửi thử**.
2. Ở ô **Gửi tới**, nhập tối đa 5 email, cách nhau bằng dấu phẩy. Ô này điền sẵn email của bạn.
3. Bấm **Gửi thử**.

Email thử dùng bản nháp hiện tại và giá trị mẫu cho các biến. Bạn không cần lưu trước.

## Khôi phục nội dung gốc

Bấm **Khôi phục mặc định đã dịch** để bỏ phần đã sửa và quay về lời văn gốc của MP Learning.

## Ngôn ngữ của email

Góc phải trang ghi **Gửi bằng** kèm ngôn ngữ của mẫu đang sửa. Bấm **Đổi** để tới mục ngôn ngữ trong [Cấu hình đào tạo](/help/settings/learning-portal-settings).

> **Lưu ý:** Email gửi đi dùng ngôn ngữ mặc định của tổ chức khi bật **Bắt buộc học viên dùng ngôn ngữ này**. Khi chưa bật, email luôn gửi bằng tiếng Việt, và trang này cũng mở bản tiếng Việt để sửa. Dòng **Gửi bằng** luôn cho biết bản bạn đang sửa là bản được gửi đi.

> **Mẹo:** Muốn ngừng gửi một loại email thay vì sửa nội dung, dùng [Thông báo email](/help/settings/email-notifications).
