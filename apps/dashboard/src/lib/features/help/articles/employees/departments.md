---
title: Quản lý phòng ban
description: Tạo, đổi tên, gộp và xóa phòng ban dùng chung cho hồ sơ nhân viên, giao khóa và báo cáo.
order: 5
audience: HR, Admin
---

Danh sách phòng ban dùng chung cho hồ sơ nhân viên, cho việc giao khóa theo nhóm và cho phần **Theo phòng ban** trong báo cáo. Giữ tên phòng ban gọn gàng thì báo cáo mới chính xác.

## Phòng ban được tạo thế nào

Không có nút tạo phòng ban riêng. Phòng ban được tạo tự động khi bạn gõ một tên mới vào ô **Phòng ban** lúc thêm hoặc sửa nhân viên, hoặc khi nhập tệp có cột `department`.

Tên được chuẩn hóa khi lưu: khác chữ hoa hay khoảng trắng vẫn là một phòng ban. "Kế toán", " kế  toán " và "KẾ TOÁN" là cùng một phòng ban. Còn "Ke toan" (không dấu) là một tên khác.

## Mở danh sách phòng ban

Trên trang **Nhân viên**, bấm nút **Phòng ban**. Hộp thoại liệt kê từng phòng ban, kèm cột **Đang làm / tổng**: số nhân viên đang hoạt động trên tổng số hồ sơ thuộc phòng ban đó, kể cả người đã nghỉ việc.

Chỉ HR và Quản trị hệ thống thấy nút này.

## Đổi tên phòng ban

1. Bấm vào ô tên phòng ban và sửa tên.
2. Bấm **Lưu** (nút chỉ hiện khi tên đã thay đổi), hoặc nhấn Enter.

Mọi nhân viên của phòng ban nhận tên mới ngay. Hệ thống báo **Đã đổi tên phòng ban**.

## Gộp hai phòng ban

Đổi tên một phòng ban trùng với tên một phòng ban khác sẽ gộp hai phòng ban làm một. Ví dụ, đổi "Ke toan" thành "Kế toán": nhân viên của "Ke toan" chuyển sang "Kế toán", rồi "Ke toan" bị xóa. Hệ thống báo **Đã gộp vào phòng ban có cùng tên**.

> **Lưu ý:** Không hoàn tác được thao tác gộp. Muốn tách lại, bạn phải sửa phòng ban của từng nhân viên.

## Xóa phòng ban

Chỉ xóa được phòng ban không còn hồ sơ nhân viên nào, kể cả hồ sơ đã nghỉ việc. Biểu tượng thùng rác chỉ hiện ở phòng ban có tổng số nhân viên bằng 0. Bấm biểu tượng để xóa, hệ thống báo **Đã xóa phòng ban**.

Muốn xóa phòng ban vẫn còn người, hãy chuyển những người đó sang phòng ban khác trước, hoặc gộp phòng ban này vào phòng ban khác như trên.

## Phòng ban được dùng ở đâu

- Bộ lọc phòng ban trên trang **Nhân viên**.
- Chế độ **Theo nhóm** khi [giao khóa học](/help/assignments/assign-courses).
- Bộ lọc và bảng **Theo phòng ban** trong [Phân tích đào tạo](/help/reports/training-analytics). Nhân viên chưa có phòng ban được gom vào dòng **Chưa có phòng ban**.

> **Mẹo:** Thống nhất cách viết tên phòng ban (có dấu, viết đầy đủ) trước khi nhập danh sách lớn. Sửa trong tệp dễ hơn gộp sau khi nhập.
