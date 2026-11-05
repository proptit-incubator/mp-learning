---
title: Kết nối công cụ AI qua MCP
description: Tạo khóa MCP và nối Claude Code, Codex, Cursor, OpenCode hoặc ứng dụng MCP khác với MP Learning.
order: 2
audience: Admin
---

MCP (Model Context Protocol) cho phép công cụ AI trên máy tính của bạn đọc và soạn nội dung trong MP Learning. Bạn tạo một khóa MCP, dán vào cấu hình của công cụ, rồi nhờ AI bằng lời: "Tạo khóa học từ tài liệu này", "Thêm bài tập cuối chương 2".

## Tạo khóa MCP

1. Mở **Tích hợp** → tab **MCP**.
2. Bấm **Tạo khóa MCP** (nút dấu cộng cạnh **Khóa MCP**).
3. Nhập **Tên khóa**, ví dụ tên người và công cụ sẽ dùng: "Lan – Claude Code". Bấm **Tạo khóa**.
4. Hộp **Khóa MCP mới của bạn** hiện khóa bắt đầu bằng `cio_mcp_`. Bấm **Sao chép** và cất vào nơi an toàn.

> **Lưu ý:** Khóa chỉ hiện một lần. Đóng hộp thoại là không xem lại được; bạn chỉ còn cách đổi khóa.

Ngay sau khi tạo, các đoạn cấu hình trong phần **Thiết lập ứng dụng** được điền sẵn khóa vừa tạo.

## Kết nối ứng dụng

Máy cần cài Node.js, vì máy chủ MCP chạy bằng lệnh `npx -y https://<địa chỉ MP Learning>/mcp/mp-learning-mcp.tgz` (gói MCP riêng của MP Learning, đã có sẵn trong các đoạn mã trên trang). Trong phần **Thiết lập ứng dụng**, chọn tab **Cursor**, **Claude Code**, **Codex** hoặc **OpenCode**, bấm nút sao chép ở góc khối mã rồi làm theo:

- **Claude Code** và **Codex**: dán lệnh vào terminal và chạy.
- **Cursor** và **OpenCode**: dán khối JSON vào tệp cấu hình MCP của ứng dụng.

Ví dụ cho Claude Code (địa chỉ máy chủ trên trang đã được điền đúng sẵn):

```bash
claude mcp add-json mp-learning '{
  "command": "npx",
  "args": ["-y", "https://<địa chỉ MP Learning>/mcp/mp-learning-mcp.tgz"],
  "env": {
    "CLASSROOMIO_API_URL": "<địa chỉ máy chủ MP Learning>",
    "CLASSROOMIO_API_KEY": "<khóa MCP của bạn>"
  }
}'
```

Với ứng dụng MCP khác, khai báo một máy chủ MCP kiểu stdio chạy lệnh `npx -y https://<địa chỉ MP Learning>/mcp/mp-learning-mcp.tgz` với hai biến môi trường:

- `CLASSROOMIO_API_URL`: địa chỉ máy chủ, sao chép từ đoạn cấu hình trên trang.
- `CLASSROOMIO_API_KEY`: khóa MCP.

Khởi động lại ứng dụng, rồi hỏi thử: "Liệt kê các khóa học trong MP Learning".

## Đổi và thu hồi khóa

Bảng **Khóa MCP** cho biết **Trạng thái** (**Đang hoạt động** hoặc **Đã thu hồi**), **Ngày tạo** và **Dùng lần cuối**. Bấm dấu ba chấm ở cuối dòng:

- **Đổi khóa**: tạo mã mới cho cùng khóa. Mã cũ ngừng hoạt động ngay, nên phải dán mã mới vào ứng dụng. Dùng khi nghi khóa bị lộ.
- **Thu hồi**: vô hiệu hóa khóa vĩnh viễn. Không khôi phục được; cần thì tạo khóa mới.

## Quyền của khóa MCP

Khóa MCP làm việc trên toàn tổ chức và được cấp sẵn một bộ quyền cố định:

- Xem danh sách khóa học, cấu trúc khóa; tạo khóa học dạng nháp rồi xuất bản.
- Đọc, tạo, sửa chương, bài học, bài tập, câu hỏi và mẫu khóa học.
- Xem và quản lý học viên trong khóa, chứng chỉ, bài nộp và điểm.
- Xem báo cáo, danh sách học viên và đội ngũ của tổ chức, tải tệp lên.

Mọi thay đổi qua MCP được ghi nhận là của Admin đã tạo khóa. Khóa MCP không có quyền mở toàn bộ API công khai; việc đó dùng [khóa API](/help/automation/api-keys).

> **Lưu ý:** AI làm đúng những gì bạn yêu cầu, kể cả xóa hay xuất bản. Đọc kỹ các bước công cụ đề xuất trước khi đồng ý, nhất là với khóa đang có học viên.

## Giới hạn

Hai thẻ ở đầu trang cho biết giới hạn hiện tại của tổ chức:

- **Khóa đang hoạt động**: `Đã dùng: x / y`. Khi đủ số khóa tối đa, thu hồi khóa không dùng trước khi tạo khóa mới.
- **Giới hạn tần suất**: số yêu cầu đọc / ghi / xuất bản được phép mỗi phút cho mỗi khóa. Cả tổ chức cũng có giới hạn chung. Vượt giới hạn, yêu cầu bị từ chối; chờ một phút rồi thử lại.

## Xem thêm

- [Tổng quan tự động hóa và tích hợp](/help/automation/overview)
- [Tham chiếu API](/help/automation/api-reference)
