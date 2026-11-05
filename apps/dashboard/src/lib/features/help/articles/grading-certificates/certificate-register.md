---
title: Sổ chứng chỉ
description: Tra danh sách mọi chứng chỉ đã cấp, lọc chứng chỉ sắp hết hiệu lực, thu hồi và khôi phục chứng chỉ.
order: 5
audience: L&D, HR, Admin, Quản lý
---

**Sổ chứng chỉ** liệt kê mọi chứng chỉ đã cấp, kèm ngày cấp, hạn hiệu lực và trạng thái. Bạn dùng sổ để biết ai sắp phải học lại, xuất danh sách cho kiểm tra nội bộ và thu hồi chứng chỉ cấp sai.

## Ai xem được sổ

- Admin, L&D và HR xem chứng chỉ của toàn công ty.
- Quản lý xem chứng chỉ của nhân viên trong cây báo cáo của mình.
- Chỉ Admin và L&D thu hồi hoặc khôi phục được chứng chỉ.

## Mở sổ chứng chỉ

Sổ nằm trong khu vực học tập, ở địa chỉ `/lms/certificate-register`.

1. Nếu bạn đang ở trang quản trị, bấm vào tên mình ở cuối thanh bên và chọn **Mở không gian học tập**.
2. Chọn **Sổ chứng chỉ** trong thanh bên.

## Bốn ô tổng quan

Đầu trang có bốn ô đếm số chứng chỉ theo trạng thái:

- **Còn hiệu lực**: đang có giá trị và chưa tới kỳ học lại.
- **Sắp hết hiệu lực**: sẽ hết hạn trong số ngày bạn chọn.
- **Hết hiệu lực**: đã quá ngày hiệu lực, nhân viên cần học lại.
- **Đã thu hồi**: trang xác minh báo chứng chỉ không còn giá trị.

Bấm vào một ô để chỉ xem chứng chỉ ở trạng thái đó. Bấm lại để bỏ lọc.

Ở dòng **Tính sắp hết hiệu lực trong**, chọn **30 ngày**, **60 ngày** hoặc **90 ngày** để đổi khoảng thời gian của ô **Sắp hết hiệu lực**.

## Tìm và lọc

- Ô tìm kiếm nhận tên, mã nhân viên hoặc mã chứng chỉ.
- Chọn một khóa trong danh sách **Tất cả khóa học**.
- Chọn một phòng ban trong danh sách **Tất cả phòng ban**. Danh sách này chỉ hiện khi có từ hai phòng ban trở lên.
- Bấm **Xóa bộ lọc** để về danh sách đầy đủ.

Cột **Hiệu lực đến** ghi ngày hết hạn và số ngày còn lại, ví dụ **Còn 25 ngày**. Chứng chỉ của khóa không học lại định kỳ ghi **Không thời hạn**. Bấm tên nhân viên để mở hồ sơ của họ trên trang **Nhân viên**.

## Xuất danh sách

Bấm **Xuất CSV** ở góc phải, hoặc mở **Định dạng xuất khác** để chọn Excel, PDF hoặc HTML. Tệp xuất theo đúng bộ lọc đang chọn. Tệp gồm tên, mã nhân viên, phòng ban, khóa học, mã chứng chỉ, ngày cấp, hạn hiệu lực, trạng thái và lý do thu hồi.

## Thu hồi chứng chỉ

1. Bấm nút **…** ở cuối dòng, chọn **Thu hồi**.
2. Nhập **Lý do thu hồi**, ít nhất 3 ký tự. Ví dụ: cấp nhầm người.
3. Bấm **Thu hồi**.

Sau khi thu hồi, trang tra cứu báo **Đã thu hồi** và nhân viên không tải được chứng chỉ đó nữa. Lý do được lưu vào nhật ký của nhân viên và hiện dưới trạng thái trong sổ.

## Khôi phục chứng chỉ

Bấm **…** ở dòng chứng chỉ đã thu hồi, chọn **Khôi phục**. Chứng chỉ trở lại trạng thái bình thường và việc khôi phục cũng được ghi vào nhật ký nhân viên.

> **Mẹo:** Chọn **Mở trang xác minh** trong menu **…** để xem đúng những gì người ngoài thấy khi tra mã. Xem [Tra cứu chứng chỉ](/help/grading-certificates/verify-a-certificate).
