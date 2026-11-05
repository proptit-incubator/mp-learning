---
title: Nhập nhân viên từ Excel
description: Tạo nhiều tài khoản nhân viên cùng lúc từ tệp CSV hoặc XLSX, kiểm tra trước rồi mới nhập.
order: 2
audience: HR, Admin
---

Khi cần tạo tài khoản cho cả một đợt tuyển dụng hoặc một phòng ban, hãy nhập danh sách từ tệp thay vì thêm từng người. Hệ thống luôn cho bạn kiểm tra danh sách trước khi tạo tài khoản thật.

## Chuẩn bị tệp

1. Mở trang **Nhân viên**, bấm **Nhập Excel / CSV**, rồi bấm **Tải mẫu CSV** để lấy tệp mẫu.
2. Giữ nguyên dòng tiêu đề. Tên cột phải viết đúng như sau (tiếng Anh, phân biệt chữ hoa thường):

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `employeeCode` | Có | Mã nhân viên, cùng quy tắc như khi [thêm từng người](/help/employees/add-employees) |
| `fullname` | Có | Họ và tên |
| `email` | Có | Email công ty |
| `department` | Không | Tên phòng ban. Tên mới sẽ tạo phòng ban mới |
| `jobTitle` | Không | Chức danh |
| `startDate` | Không | Ngày vào làm, dạng `YYYY-MM-DD`, ví dụ `2026-10-27` |
| `managerCode` | Không | Mã nhân viên của quản lý trực tiếp |

3. Lưu tệp dạng `.csv` hoặc `.xlsx`. Tối đa 1.000 dòng dữ liệu và 5 MB. Với tệp XLSX, hệ thống đọc trang tính đầu tiên.

> **Lưu ý:** Tệp mẫu không có sẵn cột `managerCode`. Nếu cần, bạn tự thêm cột này. Quản lý phải là nhân viên **Đang hoạt động** từ trước. Quản lý mới có trong cùng tệp chưa kích hoạt nên chưa chọn được; hãy gán quản lý cho họ sau.

> **Mẹo:** Trong Excel, định dạng cột mã nhân viên là Text để không mất số 0 ở đầu mã.

## Kiểm tra trước khi nhập

1. Trong hộp **Nhập Excel / CSV**, chọn tệp ở ô **Tệp danh sách nhân viên**.
2. Chọn hoặc bỏ chọn **Gửi thư kích hoạt sau khi tạo tài khoản**. Tùy chọn này bật sẵn. Nếu bỏ chọn, tài khoản được lưu ở trạng thái **Chưa gửi kích hoạt**.
3. Bấm **Kiểm tra danh sách**. Đây là bước chạy thử, chưa tạo tài khoản nào.
4. Xem bảng kết quả gồm **Dòng**, **Mã nhân viên** và **Kết quả**. Dòng đúng ghi **Hợp lệ**. Dòng sai ghi rõ lý do, ví dụ trùng mã hoặc email, sai định dạng, quản lý không hợp lệ.
5. Nếu có dòng lỗi, bấm **Tải các dòng lỗi** để nhận tệp `employees-errors.csv`. Tệp này gồm các dòng lỗi kèm cột `error`, sửa xong là nhập lại được.

Nếu đổi lựa chọn gửi thư kích hoạt sau khi kiểm tra, bạn cần bấm **Kiểm tra danh sách** lại.

## Nhập thật

1. Bấm **Nhập nhân viên hợp lệ**. Nút này chỉ bật khi lần kiểm tra có ít nhất một dòng hợp lệ.
2. Hệ thống xử lý từng nhóm nhỏ và hiện kết quả từng dòng. Giữ trang mở đến khi xong.
3. Kết quả mỗi dòng là **Đã lưu thành công**, hoặc **Đã lưu tài khoản nhưng chưa gửi được thư kích hoạt** nếu chỉ có email bị lỗi.

Chỉ các dòng hợp lệ được tạo. Nhập lại cùng một tệp không ghi đè hay tạo trùng người đã có, vì những dòng đó sẽ báo trùng mã hoặc email.

## Giới hạn

- Không cấp vai trò qua tệp nhập. Mọi tài khoản nhập vào đều là nhân viên thông thường. Admin cấp vai trò sau, xem [Phân quyền vai trò](/help/employees/assign-roles).
- Nhập không cập nhật hồ sơ đã có. Muốn đổi phòng ban hay chức danh của người cũ, hãy sửa từng hồ sơ.
