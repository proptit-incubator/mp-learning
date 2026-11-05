---
title: Thêm nhân viên
description: Tạo hồ sơ và tài khoản cho một nhân viên mới, rồi gửi thư kích hoạt để họ tự đặt mật khẩu.
order: 1
audience: HR, Admin
---

Mỗi người học trên MP Learning đều có một hồ sơ nhân viên do HR hoặc Admin tạo. Nhân viên không tự đăng ký tài khoản; họ nhận thư kích hoạt và tự đặt mật khẩu.

## Ai làm được

Người giữ vai trò **HR – Nhân sự** hoặc **Quản trị hệ thống**. Admin mở trang **Nhân viên** ở thanh bên khu vực quản trị (`/employees`). HR mở **Nhân viên** ở thanh bên khu vực học tập (`/lms/employees`). L&D xem được danh sách nhưng không thêm hay sửa nhân viên.

## Các bước

1. Mở trang **Nhân viên** và bấm **Thêm nhân viên**. Admin cũng có thể bấm **Thêm nhân viên** trong khung **Lối tắt quản trị** ở trang **Tổng quan**.
2. Phần **Thông tin tài khoản**:
   - **Mã nhân viên**: tối đa 50 ký tự, gồm chữ Latin không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới, và phải bắt đầu bằng chữ hoặc số. Mã được tự chuyển thành chữ hoa (`mp001` thành `MP001`).
   - **Họ và tên**.
   - **Email công ty**: dùng để gửi thư kích hoạt và lấy lại mật khẩu.
3. Phần **Thông tin nhân sự** (đều không bắt buộc):
   - **Phòng ban**: chọn tên gợi ý hoặc gõ tên mới. Tên mới sẽ tự tạo phòng ban mới.
   - **Chức danh** và **Ngày vào làm**.
   - **Vai trò**: chỉ Quản trị hệ thống mới thấy mục này. Để trống nghĩa là nhân viên thông thường.
   - **Quản lý trực tiếp**: chọn trong danh sách nhân viên đang hoạt động, hoặc để **Không có**.
4. Chọn một trong hai nút:
   - **Tạo và gửi kích hoạt**: lưu hồ sơ và gửi ngay thư kích hoạt. Trạng thái chuyển thành **Chờ kích hoạt**.
   - **Lưu nháp**: chỉ lưu hồ sơ, không gửi email. Trạng thái là **Chưa gửi kích hoạt**. Bạn gửi thư sau, xem [Gửi liên kết kích hoạt](/help/employees/send-activation-links).

> **Lưu ý:** **Mã nhân viên** và **Email công ty** là định danh cố định. Sau khi tạo, biểu mẫu **Sửa nhân viên** không cho đổi hai trường này, nên hãy kiểm tra kỹ trước khi lưu.

## Khi email đã có tài khoản

Nếu email đã thuộc một tài khoản đang hoạt động trong tổ chức với cùng mức quyền, hồ sơ mới được gắn vào tài khoản đó và chuyển ngay sang **Đang hoạt động**. Người đó tiếp tục dùng mật khẩu cũ. Nếu email thuộc tài khoản có vai trò khác hoặc đang bị khóa, hệ thống báo lỗi để bạn kiểm tra lại quyền hiện có.

## Lỗi thường gặp

- **Mã nhân viên hoặc email đã tồn tại. Kiểm tra hồ sơ hiện có.**: đã có nhân viên dùng mã hoặc email này. Tìm trong danh sách trước khi tạo lại.
- **Kiểm tra trường bắt buộc, email, mã nhân viên và định dạng ngày.**: thiếu trường bắt buộc hoặc mã có ký tự không hợp lệ.
- **Đã lưu tài khoản nhưng chưa gửi được thư kích hoạt.**: hồ sơ đã được tạo, chỉ có email bị lỗi. Kiểm tra cấu hình email rồi gửi lại.

> **Mẹo:** Bạn có thể giao khóa học ngay cho nhân viên chưa kích hoạt. Khóa học sẽ hiện ra khi họ đăng nhập lần đầu. Xem [Giao khóa học](/help/assignments/assign-courses).

Cần thêm nhiều người một lúc? Dùng [Nhập nhân viên từ Excel](/help/employees/import-from-excel).
