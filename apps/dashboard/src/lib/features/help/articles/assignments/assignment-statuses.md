---
title: Trạng thái lượt giao
description: Ý nghĩa của sáu trạng thái chưa bắt đầu, đang học, hoàn thành, quá hạn, được miễn và hết hiệu lực, và cách hệ thống tính chúng.
order: 3
audience: HR, L&D, Admin, Quản lý
---

Mỗi lượt giao có một trạng thái do hệ thống tự tính từ tiến độ, hạn hoàn thành và lần hoàn thành gần nhất. Bạn không đặt trạng thái bằng tay; bạn chỉ thay đổi hạn, miễn hoặc thu hồi.

## Sáu trạng thái

| Trạng thái | Khi nào |
|---|---|
| **Chưa bắt đầu** | Nhân viên chưa hoàn thành bài học nào và chưa nộp bài tập nào |
| **Đang học** | Đã hoàn thành ít nhất một bài học hoặc đã nộp ít nhất một bài tập, nhưng chưa xong khóa |
| **Hoàn thành** | Đã hoàn thành khóa và kết quả còn hiệu lực |
| **Quá hạn** | Đã qua hạn hoàn thành mà chưa hoàn thành |
| **Miễn** | Lượt giao được miễn và chưa qua ngày hết miễn |
| **Hết hiệu lực** | Khóa có học lại định kỳ, kết quả hoàn thành trước đã hết hiệu lực và chưa học lại xong |

## Thứ tự ưu tiên

Khi nhiều điều kiện cùng đúng, hệ thống chọn trạng thái theo thứ tự sau:

1. **Miễn**
2. **Hoàn thành** (còn hiệu lực)
3. **Quá hạn**
4. **Hết hiệu lực**
5. **Đang học**
6. **Chưa bắt đầu**

Một số hệ quả:

- Đã hoàn thành thì không bao giờ bị tính quá hạn, kể cả khi hoàn thành sau hạn.
- Lượt giao **Hết hiệu lực** sẽ chuyển thành **Quá hạn** nếu qua hạn học lại mà vẫn chưa xong.
- Lượt giao không có hạn không bao giờ **Quá hạn**.

## Hoàn thành được tính thế nào

Nhân viên hoàn thành khóa khi đạt **Điều kiện hoàn thành** đặt trong phần cài đặt của khóa. Với bài tập yêu cầu đạt điểm, bài nộp chỉ được tính khi đạt điều kiện. Ngày hoàn thành hiện ở cột **Ngày hoàn thành** trong hồ sơ nhân viên và trong bảng **Đào tạo được giao**.

## Hết hiệu lực và học lại

Trạng thái **Hết hiệu lực** chỉ xuất hiện ở khóa bật **Học lại định kỳ**. Khi kết quả hết hiệu lực, hệ thống mở một kỳ học mới, đặt hạn học lại và gửi email cho người được giao. Xem [Học lại định kỳ cho khóa](/help/assignments/recertification).

## Trạng thái hiện ở đâu

- Hồ sơ nhân viên, bảng **Khóa học được giao**.
- Tab **Người học** của khóa, cột **Cách tham gia**.
- [Phân tích đào tạo](/help/reports/training-analytics): bộ đếm theo trạng thái và bảng **Đào tạo được giao**.
- Phía nhân viên: tab **Cần hoàn thành** trong **Khóa học của tôi**.

## Những gì không được tính

- Lượt giao đã **Thu hồi**: không còn trạng thái, tab **Người học** ghi **Không còn hiệu lực**.
- Khóa nhân viên **Tự đăng ký** vẫn có trạng thái trong hồ sơ, nhưng không được tính vào số liệu đào tạo bắt buộc của báo cáo.
- Nhân viên tạm khóa hoặc đã nghỉ việc không được tính trong báo cáo, dù lượt giao của họ vẫn còn.

> **Lưu ý:** Trong báo cáo, **Tỷ lệ hoàn thành** là số lượt **Hoàn thành** chia cho số lượt giao không được miễn. Lượt **Miễn** không làm tỷ lệ thấp đi.
