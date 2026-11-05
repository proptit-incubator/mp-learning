---
title: Phân tích một khóa học
description: Xem tiến độ, điểm và mức hoàn thành của từng học viên trong một khóa học cụ thể.
order: 4
audience: L&D, Admin
---

Mỗi khóa học có tab **Phân tích** riêng (`/courses/<id>/analytics`). Tab này cho biết học viên đã đi được bao xa trong nội dung khóa và đạt điểm bao nhiêu, ở mức từng người.

Tab **Phân tích** thuộc khu vực quản trị, dành cho Admin và L&D.

## Bốn thẻ số liệu

| Thẻ | Nội dung |
|---|---|
| **Học viên** | Số học viên của khóa |
| **Bài học** | Số bài học, kèm số bài tập gắn với bài học |
| **Tiến độ** | Phần trăm bài học đã hoàn thành, trung bình trên mọi học viên, kèm điểm bài tập trung bình |
| **Bài tập** | Phần trăm bài tập đã nộp, trung bình trên mọi học viên |

## Hai biểu đồ phân bố

- **Phân bố tiến độ học viên**: số học viên ở từng mức **Tiến độ từ 80%**, **Tiến độ 60-79%**, **Tiến độ dưới 60%**.
- **Phân bố điểm**: số học viên ở từng khoảng **Điểm từ 90%**, **Điểm 80-89%**, **Điểm 70-79%**, **Điểm dưới 70%**.

Khóa chưa có bài nộp được chấm sẽ hiện **Chưa có dữ liệu điểm**.

## Bảng tiến độ học viên

Phần **Tổng quan tiến độ học viên** liệt kê từng học viên. Cột **Tên học viên** có thanh tiến độ, tiếp theo là **Bài học đã hoàn thành**, **Bài tập đã nộp**, **Điểm trung bình** và **Truy cập lần cuối**. Bấm **Xem chi tiết** để mở trang chi tiết của học viên đó trong tab **Người học**.

Bảng chưa sắp xếp được theo cột. Muốn sắp xếp hoặc lọc, hãy xuất ra Excel.

## Xuất số liệu của khóa

Bấm nút xuất ở đầu trang để tải bảng học viên dưới dạng CSV, Excel, PDF hoặc HTML. Tệp gồm tên, email, số bài học và bài tập đã xong, tiến độ, điểm trung bình chung và lần truy cập cuối. Xem [Xuất dữ liệu](/help/reports/export-data).

## Khác gì với Phân tích đào tạo

| | Tab **Phân tích** của khóa | [Phân tích đào tạo](/help/reports/training-analytics) |
|---|---|---|
| Phạm vi | Một khóa | Mọi khóa của công ty |
| Ai được tính | Mọi người đã từng vào khóa với tư cách học viên | Nhân viên đang hoạt động có lượt **Được giao** |
| Đo gì | Tiến độ bài học, bài nộp, điểm | Trạng thái lượt giao, hạn, quá hạn |

> **Lưu ý:** Tab **Phân tích** của khóa tính cả học viên tự đăng ký, học viên đã bị thu hồi lượt giao và nhân viên đã nghỉ việc, vì họ vẫn còn tư cách học viên trong khóa. Vì vậy số **Học viên** ở đây có thể lớn hơn số **Nhân viên được giao** của khóa trong **Phân tích đào tạo**. Khi báo cáo đào tạo bắt buộc, hãy dùng **Phân tích đào tạo**.

## Khi nào dùng tab này

- Tìm bài học hoặc bài tập làm học viên chững lại, dựa vào cột tiến độ và bài tập đã nộp.
- Xem điểm trung bình trước khi chỉnh sửa bài tập.
- Tìm người lâu không truy cập qua cột **Truy cập lần cuối**.

Muốn xem trạng thái lượt giao, hạn và đợt đào tạo của từng người trong khóa, hãy dùng tab **Người học**. Xem [Quản lý lượt giao](/help/assignments/manage-assignments).
