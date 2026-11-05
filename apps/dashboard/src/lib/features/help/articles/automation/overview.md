---
title: Tổng quan tự động hóa và tích hợp
description: Ba cách nối MP Learning với công cụ khác (MCP, API, webhook) và ai được quản lý chúng.
order: 1
audience: Admin
---

MP Learning có ba cách để công cụ khác làm việc với dữ liệu đào tạo mà không cần ai bấm tay trên giao diện. Cả ba nằm ở mục **Tích hợp** trên thanh bên, chia thành ba tab **MCP**, **API** và **Webhook**.

## Ba cách tích hợp

| Cách | Chiều dữ liệu | Dùng khi |
|---|---|---|
| **MCP** | Công cụ AI gọi vào MP Learning | Bạn muốn nhờ Claude Code, Codex, Cursor hoặc OpenCode soạn khóa học, thêm bài tập, xem báo cáo bằng lời |
| **API** | Hệ thống của bạn gọi vào MP Learning | Đồng bộ nhân viên, khóa học, kết quả học với HRIS hoặc hệ thống nội bộ bằng script |
| **Webhook** | MP Learning gửi ra hệ thống của bạn | Muốn biết ngay khi có người hoàn thành khóa, được cấp chứng chỉ, nộp bài… |

- MCP và API dùng **khóa** do tổ chức tạo. Mỗi khóa thuộc về tổ chức, không thuộc về một người, và có thể đổi hoặc thu hồi bất cứ lúc nào.
- Webhook dùng **mã bí mật ký** để bên nhận kiểm tra yêu cầu thật sự đến từ MP Learning.

## Ai quản lý được

Chỉ **Admin** (vai trò **Quản trị hệ thống**) mới thấy mục **Tích hợp** trên thanh bên, và chỉ Admin tạo, đổi, thu hồi khóa hoặc tạo, sửa, xóa webhook. Máy chủ cũng kiểm tra quyền này cho mọi thao tác.

Người không phải Admin mở trang sẽ thấy **Chỉ có quyền xem**: họ đọc được hướng dẫn thiết lập nhưng không thấy danh sách khóa.

> **Lưu ý:** Thao tác qua khóa MCP hoặc khóa API có quyền ở cấp tổ chức, không bị giới hạn theo phòng ban hay khóa học. Chỉ đưa khóa cho người và công cụ bạn tin cậy, và tạo mỗi tích hợp một khóa riêng để thu hồi được từng cái.

## Khi tính năng chưa được bật

Tab **API** và **Webhook** có thể hiện **Tính năng này chưa được bật cho tổ chức. Liên hệ quản trị viên.** Khi đó máy chủ chưa mở API công khai hoặc webhook cho tổ chức; liên hệ đội vận hành MP Learning.

## Bắt đầu

1. [Kết nối công cụ AI qua MCP](/help/automation/mcp)
2. [Khóa API và xác thực](/help/automation/api-keys)
3. [Webhook](/help/automation/webhooks)
4. [Tham chiếu API](/help/automation/api-reference)

> **Mẹo:** Muốn AI soạn khóa học ngay trong MP Learning, không cần cài gì, hãy dùng [Soạn khóa học bằng AI](/help/ai/ai-course-studio). MCP dành cho người đã quen làm việc với công cụ AI trên máy tính.
