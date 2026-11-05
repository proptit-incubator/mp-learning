---
title: Quản lý trực tiếp và cây báo cáo
description: Gán quản lý trực tiếp cho nhân viên để trưởng nhóm tự động theo dõi việc học của đội mình.
order: 6
audience: HR, Admin
---

Mỗi nhân viên có thể có một **Quản lý trực tiếp**. Các quan hệ này tạo thành cây báo cáo của công ty. Cây báo cáo quyết định ai được xem kết quả học của ai, nên không cần cấp vai trò riêng cho quản lý.

## Gán quản lý trực tiếp

1. Trên trang **Nhân viên**, bấm **…** ở dòng nhân viên, chọn **Sửa nhân viên**.
2. Ở ô **Quản lý trực tiếp**, chọn người trong danh sách (hiện dạng "mã · họ tên"). Chọn **Không có** để bỏ quản lý.
3. Bấm **Lưu**.

Khi nhập danh sách, bạn có thể điền cột `managerCode` bằng mã của quản lý. Xem [Nhập nhân viên từ Excel](/help/employees/import-from-excel).

## Ai chọn được làm quản lý

- Chỉ nhân viên **Đang hoạt động** mới có trong danh sách. Người chưa kích hoạt, đang tạm khóa hoặc đã nghỉ việc không chọn được.
- Không chọn chính nhân viên đó.
- Không được tạo vòng tròn. Ví dụ, A quản lý B thì B không thể là quản lý của A, kể cả qua người trung gian. Nếu vi phạm, hệ thống báo **Chọn quản lý đang hoạt động trong tổ chức. Không được tạo quan hệ quản lý vòng tròn.**

> **Lưu ý:** Nếu quản lý hiện tại của một nhân viên bị tạm khóa hoặc nghỉ việc, lần sửa hồ sơ sau của nhân viên đó sẽ báo lỗi trên cho đến khi bạn chọn quản lý khác hoặc **Không có**. Khi một quản lý nghỉ việc, hãy chuyển cấp dưới của họ sang quản lý mới.

## Quản lý xem được gì

Ngay khi có ít nhất một cấp dưới chưa nghỉ việc, quản lý thấy thêm hai mục ở thanh bên khu vực học tập:

- **Nhân viên**: danh sách cấp dưới, kể cả cấp dưới gián tiếp (cấp dưới của cấp dưới). Quản lý mở được hồ sơ và bảng khóa học của từng người, nhưng không thấy **Lịch sử tài khoản**, không sửa hồ sơ và không giao khóa.
- **Báo cáo đội của tôi**: báo cáo đào tạo chỉ gồm những người trong nhánh của mình. Xem [Báo cáo đội của tôi](/help/reports/my-team-report).

Quản lý cũng thấy **Sổ chứng chỉ** cho đội của mình.

Nếu quản lý đồng thời giữ vai trò HR, L&D hoặc Quản trị hệ thống, họ xem toàn công ty theo vai trò đó.

## Cây báo cáo và quyền xem

| Quan hệ | Quản lý A xem được |
|---|---|
| B báo cáo cho A | B |
| C báo cáo cho B | B và C |
| D ở phòng ban khác, không báo cáo cho A | Không |

Quyền xem đi theo cây báo cáo, không theo phòng ban. Một trưởng phòng chỉ thấy những người được gán quản lý là mình (trực tiếp hoặc gián tiếp), không tự động thấy cả phòng ban.

> **Mẹo:** Sau khi nhập danh sách và các quản lý đã kích hoạt, hãy rà lại ô **Quản lý trực tiếp** của từng đội để báo cáo cho quản lý đầy đủ ngay từ đầu.
