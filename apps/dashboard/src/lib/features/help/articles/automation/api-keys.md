---
title: Khóa API và xác thực
description: Tạo khóa API, gửi yêu cầu có xác thực đến API công khai của MP Learning và xử lý giới hạn tần suất.
order: 3
audience: Admin
---

API công khai giúp hệ thống nội bộ (HRIS, công cụ báo cáo, script) đọc và ghi dữ liệu đào tạo của MP Learning. Mỗi yêu cầu phải kèm một khóa API của tổ chức.

## Tạo khóa API

1. Mở **Tích hợp** → tab **API**.
2. Bấm **Tạo khóa API**.
3. Nhập **Tên khóa**, ví dụ "Đồng bộ HRIS". Bấm **Tạo khóa**.
4. Hộp **Khóa API mới của bạn** hiện khóa bắt đầu bằng `cio_api_`. Bấm **Sao chép** và lưu vào kho bí mật của hệ thống gọi API.

> **Lưu ý:** Khóa chỉ hiện một lần. MP Learning chỉ lưu bản băm của khóa, nên không ai, kể cả Admin, xem lại được mã đầy đủ. Bảng chỉ hiện vài ký tự đầu để bạn nhận ra khóa.

Nếu tab hiện **Tính năng này chưa được bật cho tổ chức. Liên hệ quản trị viên.**, máy chủ chưa mở API công khai cho tổ chức và nút tạo khóa sẽ báo lỗi.

## Quản lý khóa

Bảng **Khóa API** có các cột **Khóa**, **Trạng thái**, **Ngày tạo**, **Dùng lần cuối**. Bấm dấu ba chấm ở cuối dòng:

- **Đổi khóa**: cấp mã mới, mã cũ ngừng hoạt động ngay. Cập nhật mã mới vào hệ thống gọi API trước khi chạy lại.
- **Thu hồi**: khóa chuyển sang **Đã thu hồi** và không dùng lại được.

> **Mẹo:** Tạo mỗi hệ thống một khóa riêng. Khi một hệ thống ngừng dùng hoặc bị lộ khóa, bạn thu hồi đúng khóa đó mà không ảnh hưởng tích hợp khác.

## Xác thực một yêu cầu

Gửi khóa trong header `Authorization` theo kiểu Bearer:

```
Authorization: Bearer <khóa API>
```

Mọi đường dẫn API nằm dưới `/public-api/v1`. Phần **Bắt đầu nhanh** trên tab **API** có ví dụ **cURL**, **JavaScript**, **Python** và **Go** đã điền đúng địa chỉ máy chủ của bạn; khi vừa tạo khóa, ví dụ được điền sẵn cả khóa. Ví dụ lấy danh sách học viên của tổ chức:

```bash
curl https://<địa chỉ MP Learning>/public-api/v1/audience \
  -H "Authorization: Bearer <khóa API>"
```

Kết quả trả về dạng JSON, dữ liệu nằm trong trường `data`.

Không có header nào khác cho xác thực: không cần mã tổ chức, vì khóa đã gắn với tổ chức. Thao tác ghi qua khóa được ghi nhận là của Admin đã tạo khóa.

## Quyền (scope)

Khóa API được cấp quyền `public_api:*`, mở mọi đường dẫn dưới `/public-api/v1`: khóa học và nội dung, bài tập, bài nộp, học viên trong khóa, chứng chỉ, mẫu khóa học, báo cáo, học viên và đội ngũ của tổ chức, tải tệp.

Khóa MCP dùng được cùng API này nhưng chỉ với các quyền theo từng nhóm đường dẫn. Gọi đường dẫn ngoài quyền của khóa, máy chủ trả `403` với thông báo `Automation key is missing required scopes`.

## Lỗi thường gặp

| Mã | Nghĩa | Cách xử lý |
|---|---|---|
| `401` `UNAUTHORIZED` | Thiếu header, sai khóa, hoặc khóa đã đổi, đã thu hồi | Kiểm tra lại khóa trên tab **API** |
| `403` | Khóa không có quyền cho đường dẫn này | Dùng khóa API thay vì khóa MCP |
| `429` | Vượt giới hạn tần suất | Chờ theo header `Retry-After` rồi gửi lại |

## Giới hạn tần suất

- Mỗi khóa được gửi tối đa **100 yêu cầu mỗi phút**.
- Mỗi phản hồi có header `X-RateLimit-Limit`, `X-RateLimit-Remaining` và `X-RateLimit-Reset` để bạn biết còn bao nhiêu lượt.
- Vượt giới hạn, máy chủ trả `429` kèm `Retry-After` (số giây cần chờ).
- Yêu cầu gửi khóa sai cũng bị giới hạn theo địa chỉ IP, để chặn dò khóa.

Khi đồng bộ số lượng lớn, hãy gửi tuần tự hoặc theo lô nhỏ và đọc `X-RateLimit-Remaining` trước khi gửi tiếp.

## Xem thêm

- [Tham chiếu API](/help/automation/api-reference): danh sách nhóm đường dẫn.
- [Webhook](/help/automation/webhooks): nhận sự kiện thay vì hỏi API liên tục.
