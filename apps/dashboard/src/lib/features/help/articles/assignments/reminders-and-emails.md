---
title: Nhắc hạn và email thông báo
description: Các email MP Learning tự gửi khi giao khóa, khi sắp đến hạn, khi quá hạn và khi đến kỳ học lại.
order: 6
audience: HR, L&D, Admin
---

MP Learning tự gửi email cho nhân viên ở các mốc quan trọng của một lượt giao. Bạn không cần nhắc thủ công. Bài này liệt kê các email hiện có, khi nào chúng được gửi và cách bật tắt.

## Các email liên quan đến giao đào tạo

| Email | Khi nào gửi | Gửi cho |
|---|---|---|
| **Kích hoạt tài khoản nhân viên** | Khi tạo tài khoản có gửi kích hoạt, hoặc khi bấm **Gửi / gửi lại kích hoạt** | Nhân viên mới |
| **Cấp quyền truy cập khóa học** | Ngay khi giao khóa có bật **Gửi email cho người học**, và khi nhân viên tự đăng ký | Người được giao |
| **Nhắc hạn hoàn thành khóa được giao** | 7 ngày trước hạn, đúng ngày hạn, và mỗi thứ Hai khi đã quá hạn | Người được giao chưa hoàn thành |
| **Đến kỳ học lại** | Khi kết quả của khóa học lại định kỳ hết hiệu lực và kỳ mới được mở | Người được giao |

Thư **Cấp quyền truy cập khóa học** có tên khóa, lời nhắn bạn viết, hạn hoàn thành và tên đợt đào tạo (nếu có).

## Nhắc hạn hoạt động thế nào

Hệ thống quét mỗi ngày lúc 08:00 giờ Việt Nam. Một lượt giao nhận email nhắc khi đủ các điều kiện:

- Là lượt **Được giao**, có hạn hoàn thành, không đang được miễn (miễn đã qua ngày hết miễn thì vẫn nhắc) và chưa bị thu hồi.
- Chưa hoàn thành (trạng thái **Chưa bắt đầu**, **Đang học**, **Quá hạn** hoặc **Hết hiệu lực**).
- Nhân viên **Đang hoạt động** và đã kích hoạt tài khoản.
- Khóa học đã xuất bản.

Mỗi mốc chỉ gửi một lần trong ngày, kể cả khi lịch quét chạy lại. Quá hạn thì nhắc lặp lại mỗi thứ Hai cho đến khi nhân viên hoàn thành, được miễn, hoặc bạn đổi hạn.

> **Lưu ý:** Hiện chưa có nút gửi nhắc thủ công cho một người, và chưa có email nhắc gửi cho quản lý. Quản lý theo dõi qua [Báo cáo đội của tôi](/help/reports/my-team-report).

## Bật hoặc tắt email cho cả công ty

Admin vào **Cài đặt** → **Thông báo**, phần **Mặc định của tổ chức**:

- **Nhắc hạn khóa được giao** (mục **Lượt giao khóa học**): áp dụng cho cả email nhắc hạn và email **Đến kỳ học lại**.
- **Email chào mừng khi ghi danh** (mục **Ghi danh**): áp dụng cho email **Cấp quyền truy cập khóa học**.

Nếu tắt ở đây, không ai trong tổ chức nhận email đó. Nhân viên cũng có thể tự tắt **Nhắc hạn khóa được giao** trong cài đặt thông báo của mình. Email chào mừng khi ghi danh thì chỉ tắt được ở cấp tổ chức.

Ngoài ra, khi giao khóa bạn có thể tắt **Gửi email cho người học** để bỏ email cấp quyền cho riêng lần giao đó.

## Sửa nội dung email

Admin vào **Cài đặt** → **Email** (trang **Mẫu email cho nhân viên**). Các mẫu liên quan nằm ở nhóm **Tài khoản và ghi danh** (**Kích hoạt tài khoản nhân viên**, **Cấp quyền truy cập khóa học**, **Nhắc hạn hoàn thành khóa được giao**) và nhóm **Học tập** (**Đến kỳ học lại**). Nút hành động, đường dẫn và chân trang do hệ thống quản lý và không gỡ được.

> **Mẹo:** Trước khi giao một đợt lớn, hãy gửi email thử từ trang mẫu email để kiểm tra nội dung và lời nhắn hiển thị đúng.
