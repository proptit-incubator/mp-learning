---
title: Phân tích đào tạo
description: Đọc báo cáo đào tạo toàn công ty, lọc theo phòng ban, xem từng lượt giao và xuất số liệu.
order: 2
audience: HR, L&D, Admin
---

**Phân tích đào tạo** cho biết ai đã được giao khóa, ai đã học xong và ai đang quá hạn. Báo cáo chỉ tính đào tạo bắt buộc: các lượt **Được giao** của nhân viên đang hoạt động.

## Mở báo cáo

- Admin và L&D: mục **Phân tích** ở thanh bên khu vực quản trị (`/analytics`).
- HR: mục **Phân tích đào tạo** ở thanh bên khu vực học tập (`/lms/analytics`).

Quản lý không giữ vai trò thấy phiên bản thu hẹp, xem [Báo cáo đội của tôi](/help/reports/my-team-report).

## Hiện trạng đào tạo

Bốn thẻ đầu trang mô tả tình hình tại thời điểm xem, không phụ thuộc kỳ hoạt động:

- **Nhân viên được giao khóa**: số nhân viên có ít nhất một lượt giao, trên tổng số nhân viên đang hoạt động.
- **Tỷ lệ hoàn thành**: số lượt **Hoàn thành** chia cho số lượt giao không được miễn.
- **Chưa bắt đầu**: số lượt giao chưa có bài học hay bài tập nào xong.
- **Đào tạo bắt buộc quá hạn**: số lượt giao đã quá hạn mà chưa hoàn thành.

Thanh **Trạng thái các lượt học** chia tỷ lệ **Đã hoàn thành**, **Đang học** và **Chưa bắt đầu**. Dòng **Cập nhật …** cho biết thời điểm tải số liệu. Bấm nút làm mới để tải lại.

## Lọc theo phòng ban

Chọn một phòng ban ở ô **Tất cả phòng ban** cạnh tiêu đề **Hiện trạng đào tạo**. Toàn bộ báo cáo, kể cả bảng lượt giao, chỉ còn nhân viên của phòng ban đó. Đầu trang hiện nhãn **Đang xem: …**; bấm dấu x trên nhãn để xem lại tất cả.

Bảng **Theo phòng ban** (hiện khi có từ hai phòng ban trở lên) liệt kê từng phòng ban với **Nhân viên**, **Lượt giao**, **Quá hạn**, **Chưa bắt đầu** và tỷ lệ **Hoàn thành**. Bấm tên phòng ban để xem riêng phòng ban đó.

## Hoạt động học tập và việc cần theo dõi

- **Hoạt động học tập**: số **Nhân viên có hoạt động học**, **Bài học hoàn thành** và **Lượt nộp bài** theo ngày, giờ Việt Nam. Chọn kỳ **7 ngày qua**, **30 ngày qua** (mặc định) hoặc **90 ngày qua**.
- **Việc cần theo dõi**: ba lối tắt. **Đào tạo bắt buộc quá hạn** lọc bảng lượt giao theo quá hạn. **Chưa được giao khóa** và **Xem nhân viên chưa bắt đầu** mở danh sách nhân viên đã lọc sẵn để bạn [giao khóa](/help/assignments/assign-courses).
- **Nhân viên cần hỗ trợ**: tối đa 5 người, ưu tiên người có lượt quá hạn, chưa được giao khóa, rồi đến chưa bắt đầu. Bấm tên để mở hồ sơ.

## Đào tạo theo khóa học

Bảng liệt kê từng khóa với số **Nhân viên được giao**, số lượt theo trạng thái và **Tiến độ nội dung TB**. Khóa có lượt quá hạn xếp trước. Dùng ô tìm kiếm và ba nút **Tất cả khóa học**, **Đã giao**, **Quá hạn** để thu hẹp. Khóa chưa xuất bản có nhãn **Bản nháp**. Admin và L&D bấm tên khóa để mở tab **Người học** của khóa đó.

## Đào tạo được giao

Bảng chi tiết từng lượt giao, mỗi dòng là một khóa cho một nhân viên, 25 dòng mỗi trang. Các cột: **Họ và tên**, **Khóa học**, **Đợt**, **Hạn**, **Trạng thái**, **Tiến độ**. Dòng gấp nhất xếp trước: quá hạn, hết hiệu lực, chưa bắt đầu…

Cách lọc:

- Bấm một ô đếm trạng thái (**Quá hạn**, **Hết hiệu lực**, **Chưa bắt đầu**, **Đang học**, **Hoàn thành**, **Miễn**) để lọc; bấm lần nữa để bỏ lọc.
- Ô tìm kiếm tìm theo tên, mã nhân viên, phòng ban hoặc tên khóa, không cần gõ dấu.
- Ô **Tất cả khóa học** và **Tất cả đợt** lọc theo khóa và đợt đào tạo. Mỗi đợt hiện kèm số đã hoàn thành trên tổng số.

Ý nghĩa từng trạng thái xem ở [Trạng thái lượt giao](/help/assignments/assignment-statuses).

## Xuất số liệu

- Nút xuất ở đầu trang tải bảng **Đào tạo theo khóa học**.
- Nút xuất trong phần **Đào tạo được giao** tải mọi lượt giao khớp bộ lọc đang chọn, không chỉ trang đang xem.

Chi tiết định dạng xem [Xuất dữ liệu](/help/reports/export-data).

> **Lưu ý:** Lượt **Miễn** không được tính khi tính **Tỷ lệ hoàn thành**: tỷ lệ là số lượt hoàn thành chia cho số lượt giao không được miễn.
