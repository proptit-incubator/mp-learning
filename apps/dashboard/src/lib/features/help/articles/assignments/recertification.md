---
title: Học lại định kỳ cho khóa
description: Đặt thời hạn hiệu lực cho kết quả hoàn thành để nhân viên phải học lại khóa sau một số tháng.
order: 5
audience: L&D, Admin
---

Một số khóa cần học lại theo chu kỳ, ví dụ an toàn lao động hằng năm. Khi bật **Học lại định kỳ**, mỗi lần hoàn thành chỉ có hiệu lực trong một số tháng. Hết hiệu lực, nhân viên phải học lại.

## Bật học lại định kỳ

1. Mở khóa học và vào tab **Cài đặt**.
2. Trong thẻ **Điều kiện hoàn thành**, bật công tắc **Học lại định kỳ**.
3. Nhập số tháng ở ô **Hiệu lực (tháng)**. Giá trị mặc định là 12, cho phép từ 1 đến 120 tháng.
4. Bấm **Lưu thay đổi**.

Trong **Thư viện đào tạo**, trang khóa hiện thêm dòng **Học lại mỗi … tháng**.

## Hiệu lực được tính thế nào

Mỗi lần nhân viên hoàn thành khóa, hệ thống ghi một kỳ hoàn thành có ngày hết hiệu lực bằng ngày hoàn thành cộng số tháng đã đặt. Ngày này hiện ở mục **Hiệu lực đến** trong tab **Người học** và ở bảng **Đào tạo được giao** của báo cáo.

> **Lưu ý:** Số tháng được áp dụng tại thời điểm nhân viên hoàn thành. Bật tính năng hoặc đổi số tháng sau này không thay đổi ngày hết hiệu lực của những lần hoàn thành đã ghi trước đó.

## Khi kết quả hết hiệu lực

Mỗi ngày lúc 00:30 (giờ Việt Nam), hệ thống tìm những người có kết quả vừa hết hiệu lực và mở kỳ học mới cho họ:

1. Kỳ cũ được lưu vào lịch sử, kèm các bài nộp của kỳ đó. Chứng chỉ đã cấp vẫn được giữ.
2. Tiến độ bài học, bài nộp và cờ hoàn thành của khóa được xóa để nhân viên học lại từ đầu.
3. Với người **Được giao**: lượt giao nhận hạn mới bằng ngày hết hiệu lực cộng 30 ngày (nếu ngày đó đã qua thì tính 30 ngày kể từ hôm mở kỳ mới), và nhân viên nhận email **Đến kỳ học lại**.
4. Với người **Tự đăng ký**: chỉ tiến độ được mở lại, không có hạn và không có email.

Trong kỳ học lại, lượt giao có trạng thái **Hết hiệu lực**. Nếu qua hạn mới mà chưa học xong, trạng thái thành **Quá hạn**. Học xong thì trở lại **Hoàn thành** với ngày hết hiệu lực mới. Xem [Trạng thái lượt giao](/help/assignments/assignment-statuses).

Người được giao cũng nhận email nhắc hạn của kỳ học lại như mọi lượt giao có hạn, xem [Nhắc hạn và email thông báo](/help/assignments/reminders-and-emails).

> **Lưu ý:** Hệ thống chưa gửi email trước ngày hết hiệu lực. Email đầu tiên là thư **Đến kỳ học lại**, gửi khi kỳ mới được mở.

## Theo dõi người sắp hết hiệu lực

Dùng **Sổ chứng chỉ** để lọc chứng chỉ sắp hết hiệu lực, hoặc dùng bảng **Đào tạo được giao** trong [Phân tích đào tạo](/help/reports/training-analytics) và lọc trạng thái **Hết hiệu lực** để xem ai đang trong kỳ học lại.

## Tắt học lại định kỳ

Tắt công tắc **Học lại định kỳ** rồi **Lưu thay đổi**. Những lần hoàn thành sau đó không còn hết hạn.

Lần hoàn thành gần nhất của mỗi người cũng thành vĩnh viễn: ngày hết hiệu lực được bỏ, và người đang **Hết hiệu lực** trở lại **Hoàn thành**. Các kỳ cũ trong lịch sử vẫn giữ nguyên.
