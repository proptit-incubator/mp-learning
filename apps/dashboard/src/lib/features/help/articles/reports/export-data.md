---
title: Xuất dữ liệu
description: Tải danh sách nhân viên, báo cáo đào tạo và số liệu từng khóa ra CSV, Excel, PDF hoặc HTML.
order: 5
audience: HR, L&D, Admin, Quản lý
---

Bạn có thể tải hầu hết các bảng báo cáo về máy để lưu hồ sơ, gửi cấp trên hoặc phân tích thêm trong Excel. Mỗi tệp xuất chỉ gồm dữ liệu trong phạm vi quyền của bạn.

## Nút xuất trong báo cáo

Các trang báo cáo dùng chung một nút xuất. Bấm nút chính để **Xuất CSV**. Bấm mũi tên **Định dạng xuất khác** để chọn:

- **Xuất Excel**
- **Xuất PDF**: chỉ dùng được khi bảng có tối đa 2.000 dòng. Bảng lớn hơn hãy dùng CSV hoặc Excel.
- **Xuất HTML**

Nếu không có dữ liệu, nút xuất bị mờ.

## Những gì xuất được

| Trang | Nút | Nội dung tệp |
|---|---|---|
| **Phân tích đào tạo** / **Báo cáo đội của tôi** | Nút xuất ở đầu trang | Bảng **Đào tạo theo khóa học**: mỗi khóa một dòng, với số được giao, số theo trạng thái và tiến độ nội dung trung bình |
| **Phân tích đào tạo** / **Báo cáo đội của tôi** | Nút xuất trong phần **Đào tạo được giao** | Mỗi lượt giao một dòng: họ tên, mã, phòng ban, khóa, đợt, hạn, trạng thái, tiến độ, ngày hoàn thành, hiệu lực đến |
| **Nhân viên** | **Xuất danh sách** | Tệp `employees.csv` |
| Tab **Phân tích** của khóa | Nút xuất ở đầu trang | Mỗi học viên một dòng: tên, email, bài học và bài tập đã xong, tiến độ, điểm trung bình, lần truy cập cuối |

Tab **Điểm** của khóa và **Sổ chứng chỉ** cũng có nút xuất cùng kiểu.

## Xuất danh sách lượt giao theo bộ lọc

Nút xuất trong **Đào tạo được giao** tải mọi dòng khớp bộ lọc đang chọn, không chỉ 25 dòng của trang đang xem. Ví dụ, để có danh sách quá hạn của phòng Kinh doanh:

1. Mở **Phân tích đào tạo**, chọn phòng ban ở ô **Tất cả phòng ban**.
2. Trong **Đào tạo được giao**, bấm ô **Quá hạn**.
3. Bấm nút xuất và chọn định dạng.

Ngày trong tệp có dạng `YYYY-MM-DD`.

Ngược lại, nút xuất ở đầu trang luôn tải mọi khóa, không áp dụng ô tìm kiếm hay các nút lọc của bảng **Đào tạo theo khóa học**.

## Xuất danh sách nhân viên

Trên trang **Nhân viên**, bấm **Xuất danh sách**. Tệp `employees.csv` gồm các cột `employeeCode`, `fullname`, `email`, `department`, `jobTitle`, `status`, `role`, `startDate`. Trạng thái và vai trò được ghi bằng tiếng Việt như trên màn hình.

Tệp áp dụng ô tìm kiếm, bộ lọc phòng ban và tab trạng thái đang chọn. Quản lý chỉ xuất được cấp dưới của mình.

> **Lưu ý:** Bộ lọc **Chức danh** hiện không được áp dụng khi xuất. Nếu đang lọc theo chức danh, tệp vẫn gồm mọi chức danh; hãy lọc lại trong Excel.

> **Mẹo:** Tệp CSV được lưu với mã hóa UTF-8 nên mở bằng Excel vẫn hiển thị đúng tiếng Việt. Ô bắt đầu bằng dấu `=`, `+`, `-` hoặc `@` được thêm ký tự bảo vệ để Excel không hiểu nhầm là công thức.

## Giữ an toàn dữ liệu

Tệp xuất chứa họ tên, email và kết quả học của nhân viên. Chỉ lưu tệp ở nơi được công ty cho phép và xóa bản tạm sau khi dùng xong.
