---
title: Tham chiếu API
description: Các nhóm đường dẫn của API công khai, quyền tương ứng và nơi xem tài liệu OpenAPI đầy đủ.
order: 5
audience: Admin
---

Bài này liệt kê các nhóm đường dẫn của API công khai MP Learning để bạn biết tìm dữ liệu ở đâu. Cách tạo khóa và gửi yêu cầu có xác thực xem ở [Khóa API và xác thực](/help/automation/api-keys).

## Địa chỉ gốc

Mọi đường dẫn bắt đầu bằng `/public-api/v1`, ví dụ `https://<địa chỉ MP Learning>/public-api/v1/courses`. Địa chỉ máy chủ chính xác có trong các ví dụ ở phần **Bắt đầu nhanh** của tab **API**.

Dữ liệu trả về là JSON, nội dung chính nằm trong trường `data`. Đường dẫn danh sách có phân trang.

## Các nhóm đường dẫn

| Đường dẫn | Nội dung | Quyền khi dùng khóa MCP |
|---|---|---|
| `/courses`, `/courses/{courseId}` | Danh sách, chi tiết, tạo, sửa, xóa khóa học; cấu trúc khóa, học viên, xuất dữ liệu | Chỉ khóa API |
| `/courses/{courseId}/clone` | Nhân bản khóa học | `course:write` |
| `/courses/{courseId}/sections`, `/lessons`, `/content` | Chương, bài học, bản dịch, lịch sử chỉnh sửa, bình luận bài học | `course:read`, `course:write` |
| `/courses/{courseId}/exercises` | Bài tập, phần bài tập, câu hỏi | `course:exercise:read`, `course:exercise:write` |
| `/courses/{courseId}/submissions`, `/marks` | Bài nộp, chấm điểm, bảng điểm | `course:submission:read`, `course:submission:write` |
| `/courses/{courseId}/members`, `/invites` | Học viên trong khóa, đặt lại tiến độ | `course:member:read`, `course:member:write` |
| `/courses/{courseId}/members/{memberId}/lessons`, `/exercises` | Cập nhật tiến độ của một học viên | `course:student:write` |
| `/courses/{courseId}/certificate`, `/certificates` | Cài đặt chứng chỉ, danh sách và tải chứng chỉ | `course:certificate:read`, `course:certificate:write` |
| `/courses/{courseId}/analytics`, `/analytics` | Báo cáo theo khóa, theo học viên, toàn tổ chức (chỉ đọc) | `analytics:read` |
| `/course-templates`, `/courses/{courseId}/template` | Mẫu khóa học: xem, tạo khóa từ mẫu, lưu khóa thành mẫu | `course:read`, `course:write` |
| `/exercise-templates` | Mẫu bài tập | `course:exercise:read` |
| `/audience` | Học viên của tổ chức, giao khóa hàng loạt | `audience:read`, `audience:write` |
| `/team` | Đội ngũ quản trị của tổ chức | `team:read`, `team:write` |
| `/organization/email-templates` | Mẫu email của tổ chức, gửi thử | `organization:read`, `organization:write` |
| `/assets` | Tải tệp lên (chỉ ghi) | `media:write` |

Khóa API có quyền `public_api:*`, dùng được mọi dòng trong bảng. Cột cuối chỉ quan trọng khi bạn gọi API bằng khóa MCP.

Quy ước chung: `GET` để đọc; `POST`, `PUT`, `PATCH`, `DELETE` để ghi. Một khóa chỉ có quyền đọc sẽ bị từ chối với mã `403` khi gọi phương thức ghi.

## Tài liệu OpenAPI đầy đủ

Tham số, kiểu dữ liệu và ví dụ của từng đường dẫn có trong tài liệu OpenAPI. Máy chủ API phục vụ tài liệu này dưới dạng trang tương tác tại đường dẫn `/docs` của máy chủ API, khi đội vận hành đã cấu hình nguồn tài liệu. Các liên kết tài liệu trên trang **Tích hợp** mở các bài trong Trung tâm trợ giúp này.

> **Lưu ý:** Nếu liên kết báo không tìm thấy trang, máy chủ chưa bật tài liệu OpenAPI. Liên hệ đội vận hành MP Learning. Trong lúc chờ, dùng bảng trên và các ví dụ trong phần **Bắt đầu nhanh**.

## Xem thêm

- [Kết nối công cụ AI qua MCP](/help/automation/mcp)
- [Webhook](/help/automation/webhooks)
