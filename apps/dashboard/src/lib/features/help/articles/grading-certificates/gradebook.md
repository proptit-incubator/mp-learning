---
title: Bảng điểm
description: Xem điểm từng bài tập của mọi học viên trong khóa và xuất ra CSV, Excel, PDF hoặc HTML.
order: 2
audience: L&D, Admin, Học viên
---

Trang **Điểm** của khóa học tổng hợp điểm mọi bài tập trên một bảng: mỗi dòng là một học viên, mỗi cột là một bài tập. Bạn dùng trang này để xem nhanh ai còn thiếu bài và xuất bảng điểm khi cần báo cáo.

## Mở bảng điểm

1. Mở khóa học từ trang **Khóa học** (`/courses`).
2. Chọn **Điểm** trong thanh bên của khóa.

Nếu khóa chưa có học viên, trang báo **Chưa có học viên nào**.

## Đọc bảng điểm

- Cột **Học viên** ghi tên và ảnh đại diện.
- Mỗi cột bài tập ghi điểm dưới dạng phần trăm so với điểm tối đa của bài đó. Ô có dấu **-** là bài chưa nộp hoặc chưa có điểm.
- Cột **Điểm trung bình** là tổng điểm đạt được chia cho tổng điểm tối đa của mọi bài tập, tính theo phần trăm. Bài chưa có điểm được tính là 0.

Màu ô giúp đọc nhanh: xanh lá từ 90% trở lên, xanh dương từ 80%, vàng từ 70%, đỏ dưới 70%.

> **Lưu ý:** Bảng chỉ có điểm sau khi bài được chấm. Bài đang chờ chấm tay vẫn hiện **-** cho tới khi bạn bấm **Gửi điểm**. Xem [Xem và chấm bài nộp](/help/grading-certificates/review-and-grade-submissions).

Bấm nút làm mới ở góc phải để tải lại số liệu mới nhất.

## Xuất bảng điểm

1. Bấm **Xuất CSV** ở góc phải trang.
2. Muốn định dạng khác, mở **Định dạng xuất khác** và chọn **Xuất Excel**, **Xuất PDF** hoặc **Xuất HTML**.

Tệp xuất gồm tên, email, điểm từng bài tập và điểm trung bình. Khi bảng có quá nhiều dòng, mục PDF bị tắt và ghi chú **Quá nhiều dòng — hãy dùng CSV hoặc Excel**. Khi đó hãy dùng CSV hoặc Excel.

Chỉ Admin và L&D thấy nút xuất.

## Học viên có xem được điểm không

Học viên chỉ thấy mục **Điểm** khi Admin bật **Chấm điểm** trong [Cấu hình đào tạo](/help/settings/learning-portal-settings). Khi đó học viên chỉ thấy dòng điểm của chính mình. Khi mục này tắt, học viên vẫn xem được điểm và nhận xét của từng bài ngay trong bài tập.
