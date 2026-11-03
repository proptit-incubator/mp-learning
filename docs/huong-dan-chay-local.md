# Hướng dẫn chạy MP Learning trên máy (local dev)

Áp dụng cho Windows 11 + Docker Desktop. Chạy các lệnh trong **Git Bash** tại thư mục gốc repo `D:\Project\LMS\classroomio`.

## 1. Chuẩn bị (một lần)

| Công cụ | Ghi chú |
|---|---|
| Node.js 24 | Đang dùng 24.14 (repo khuyến nghị 24.22.1, chỉ cảnh báo) |
| pnpm 10.19.0 | `npm i -g pnpm@10.19.0` |
| Docker Desktop | Phải đang chạy trước khi khởi động hạ tầng |

```bash
pnpm install
pnpm turbo run build --filter=@cio/api^... --filter=@cio/dashboard^... --filter=@cio/jobs-worker^...
```

File cấu hình đã có sẵn (đều bị Git bỏ qua):

| File | Vai trò |
|---|---|
| `apps/api/.env` | API: database, Redis, bí mật xác thực, khóa AI, danh sách email được đăng ký |
| `apps/jobs/.env` | Worker nền — bản sao của `apps/api/.env` |
| `apps/dashboard/.env` | Giao diện: `PUBLIC_SERVER_URL=http://localhost:3081`, danh sách domain được nhúng `CSP_*_DOMAINS` |
| `.env` | Dùng cho chế độ chạy toàn bộ bằng Docker |
| `.env.local` | Tài khoản thử (admin và học viên) |

## 2. Chạy hệ thống (mỗi lần mở máy)

Mở 3 terminal Git Bash:

**Terminal 1 — hạ tầng (PostgreSQL, Redis, lưu trữ file):**
```bash
docker compose -p mp-learning-test --profile storage up -d postgres redis storage storage-init
```

**Terminal 2 — API (cổng 3081) + worker nền (email, webhook, AI, video):**
```bash
pnpm api:dev
```

**Terminal 3 — Dashboard (cổng 3082):**
```bash
cd apps/dashboard && pnpm exec vite dev --port 3082 --strictPort
```

Mở http://localhost:3082/login. Lần đầu mở mỗi trang, Vite cần 10–30 giây để biên dịch.

Dừng hệ thống: `Ctrl+C` ở terminal 2 và 3, rồi chạy:
```bash
docker compose -p mp-learning-test stop
```

> Luôn dùng `-p mp-learning-test`: dữ liệu nằm trong volume của project này. Bỏ cờ này, Docker sẽ báo trùng tên container `cio-*`.

## 3. Tài khoản thử

Email và mật khẩu nằm trong `.env.local`:

| Vai trò | Biến |
|---|---|
| Quản trị (admin) | `MP_TEST_EMAIL` / `MP_TEST_PASSWORD` |
| Học viên | `MP_STUDENT_EMAIL` / `MP_STUDENT_PASSWORD` (`hocvien@example.test`, tên "Lê Văn Học") |

Học viên đã được duyệt email, là thành viên tổ chức MP Transformation, đã ghi danh khóa mẫu và thuộc chương trình "Onboarding MP 2026". Đăng nhập học viên sẽ vào `/lms`.

**Thêm học viên mới:** vào *Nhân viên → Mời* (hoặc *Nhập danh sách*), hoặc thêm email vào `LMS_ALLOWED_EMAILS` trong `apps/api/.env` rồi khởi động lại API. Chưa cấu hình SMTP nên email xác minh không được gửi. Xác minh thủ công bằng lệnh:
```bash
docker exec cio-postgres psql -U mp_learning -d mp_learning -c "update \"user\" set email_verified=true where email='EMAIL'; update profile set is_email_verified=true where email='EMAIL';"
```

## 4. Bật AI

AI tự bật khi máy chủ có **khóa của nhà cung cấp AI** (đặt `AI_ENABLED=false` để tắt hẳn trên máy chủ). Hạn mức mặc định là 15 triệu đơn vị AI mỗi tháng cho cả tổ chức. Admin chỉnh công tắc và hạn mức ở **Cài đặt → AI**. Để thêm khóa:

1. Lấy khóa Gemini (khuyến nghị, vì là model mặc định cho học viên và cho trình tạo khóa học) tại https://aistudio.google.com/apikey.
2. Dán khóa vào **cả hai file** `apps/api/.env` và `apps/jobs/.env`:
   ```
   GOOGLE_API_KEY=...
   # tùy chọn:
   OPENAI_API_KEY=...      # GPT + chuyển giọng nói thành văn bản (Whisper) cho video
   ANTHROPIC_API_KEY=...   # Claude (chỉ admin chọn được trong bộ chọn model)
   ```
3. Khởi động lại `pnpm api:dev`.

Các tính năng AI sau khi có khóa:

| Tính năng | Vị trí |
|---|---|
| Tạo khóa học bằng AI | *Trang chủ* của tổ chức |
| Trợ lý AI | Nút **Trợ lý** trong khóa học (cho admin/giảng viên) |
| Gia sư AI cho học viên | Học viên hỏi trong bài học. Cấu hình ở *Cài đặt → Gia sư AI* hoặc *Khóa học → Gia sư AI* |
| Tóm tắt bài học, "Hỏi AI" về đoạn văn bản đã chọn | Trong trang bài học |
| Theo dõi hạn mức AI | *Cài đặt → Tín dụng AI* |

Khi chưa có khóa, các nút AI vẫn hiển thị nhưng sẽ báo "AI chưa được cấu hình".

Kết quả test với Gemini 3.1 Flash Lite (ngày 24/10/2026):
- Gia sư AI trả lời học viên trong khoảng 2 giây, có dẫn đúng bài học.
- Trình tạo khóa học dựng được khung (chương, bài, bài kiểm tra) nhưng **không tự viết nội dung bài học**, và mỗi bài kiểm tra chỉ có 1–2 câu hỏi. Sau khi tạo khung, nhắn tiếp cho Trợ lý trong khóa học, ví dụ "Hãy viết nội dung chi tiết cho các bài học", "Thêm 5 câu hỏi cho mỗi bài kiểm tra". Muốn chất lượng tốt hơn thì thêm `OPENAI_API_KEY` hoặc `ANTHROPIC_API_KEY` rồi chọn model khác ở ô chọn model; chỉ admin mới chọn được model.
- Khi chạy toàn bộ bằng Docker, cũng cần điền `GOOGLE_API_KEY` vào file `.env` ở thư mục gốc.

## 5. Tự động hóa (Automation)

Menu **Công cụ → Tự động hóa** (chỉ admin) có 4 tab:

| Tab | Cách dùng |
|---|---|
| **MCP** | *Tạo khóa MCP*, rồi cấu hình cho Claude Desktop, Cursor, Codex… (ví dụ bên dưới). AI agent sẽ đọc và ghi khóa học, học viên, bài tập |
| **API** | Tạo khóa `cio_api_…`, gọi REST API tại `http://localhost:3081/public-api/v1/...` với header `Authorization: Bearer <khóa>` |
| **Zapier** | Tạo khóa cho Zapier/Make/n8n |
| **Webhooks** | Đăng ký URL nhận sự kiện (học viên ghi danh, hoàn thành bài…). Gửi tới `localhost` được nhờ `WEBHOOK_ALLOW_PRIVATE_NETWORKS=true` |

Cấu hình MCP sau khi đã build bằng `pnpm mcp:build`:
```json
{
  "mcpServers": {
    "mp-learning": {
      "command": "node",
      "args": ["D:/Project/LMS/classroomio/packages/mcp/dist/index.js"],
      "env": {
        "CLASSROOMIO_API_URL": "http://localhost:3081",
        "CLASSROOMIO_API_KEY": "cio_mcp_..."
      }
    }
  }
}
```

Ví dụ gọi REST API:
```bash
curl -H "Authorization: Bearer cio_api_..." http://localhost:3081/public-api/v1/courses
```

## 6. Khóa học mẫu: "Chuyển đổi số cho nhân viên MP"

Khóa học tự học, đã xuất bản, chế độ học tuần tự, gồm:

- **Trang giới thiệu:** mục tiêu, yêu cầu, kỹ năng, công cụ, giảng viên, phần thưởng. Gắn thẻ *Chuyển đổi số* và *Onboarding*.
- **Chương 1 · Nền tảng chuyển đổi số**
  - *Chuyển đổi số là gì?* — video YouTube, bảng, trích dẫn. Bài công khai (xem trước được).
  - *Tư duy số của nhân viên* — có tài liệu PDF "Cẩm nang chuyển đổi số" đính kèm, file nằm trong kho lưu trữ local. Bài chưa gắn slide: bạn có thể dán link Google Slides/Canva/PowerPoint của MP vào tab *Slides*.
  - *An toàn thông tin cơ bản* — chỉ hoàn thành khi đã xem 80% video.
  - *Bài tập Chương 1* — trắc nghiệm một đáp án, nhiều đáp án, đúng/sai, trả lời ngắn. Được làm lại.
- **Chương 2 · Công cụ và AI trong công việc**
  - *Công cụ cộng tác trực tuyến*
  - *Ứng dụng AI tạo sinh* — có video, gợi ý dùng tóm tắt và trợ lý AI.
  - *Hội thảo trực tuyến* — buổi học trực tiếp sau 3 ngày, 60 phút, có bản ghi, nhắc lịch trước 1 ngày và trước 1 giờ, có điểm danh. Link Google Meet chỉ là link mẫu, cần thay bằng link phòng họp thật.
- **Chương 3 · Đánh giá cuối khóa**
  - *Tổng kết khóa học*
  - *Bài kiểm tra cuối khóa* — câu hỏi số, điền khuyết, ngân hàng từ, sắp xếp thứ tự, tự luận, nộp link, đánh giá sao, thích/không thích. Hạn nộp 14 ngày, cần đạt 70%.
- **Chứng chỉ:** mẫu *classique*, 2 người ký, cho phép tải về.
- **Tương tác:** thông báo ghim trên bảng tin, bình luận của học viên trong bài 1, câu hỏi ở mục *Cộng đồng*, học viên đã hoàn thành bài 1.
- **Chương trình đào tạo** *Onboarding MP 2026* gồm khóa mẫu và học viên, có bài đăng chào mừng.
- Nội dung bài học có cả bản tiếng Việt và tiếng Anh. Đổi ngôn ngữ ở góc phải trang bài học.

## 7. Kịch bản test nhanh

1. **Admin:** mở khóa học, chỉnh một bài học, xem *Bài nộp*, *Điểm*, *Phân tích*, *Chứng chỉ*. Tạo khóa MCP hoặc API ở *Tự động hóa*.
2. **Học viên** (dùng cửa sổ ẩn danh): đăng nhập, vào *Học tập của tôi*, học tuần tự, làm bài tập Chương 1, làm bài kiểm tra cuối khóa.
3. **Admin:** chấm câu tự luận ở *Bài nộp*, rồi kiểm tra học viên nhận chứng chỉ.
4. Nếu đã thêm khóa AI: học viên hỏi Gia sư AI trong bài *Ứng dụng AI tạo sinh*.

## 8. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Video/slide báo "This content is blocked. Contact the site owner…" | Bản self-hosted chặn mọi nội dung nhúng từ domain ngoài. Danh sách domain được phép nằm ở các biến `CSP_*_DOMAINS` trong `apps/dashboard/.env` (chạy dev) và `.env` (chạy Docker). Thêm domain cần nhúng vào `CSP_FRAME_SRC_DOMAINS`, cách nhau bằng dấu phẩy, rồi khởi động lại dashboard |
| Tài liệu đính kèm báo `NoSuchKey` | Tài liệu phải được tải lên bằng nút tải lên trong bài học. Ứng dụng đọc file từ kho lưu trữ, không dùng link ngoài |
| Trang khóa học kẹt ở "Đang tải khóa học…" | Kiểm tra `PUBLIC_SERVER_URL=http://localhost:3081` trong `apps/dashboard/.env`, rồi khởi động lại dashboard |
| `Conflict. The container name "/cio-…" is already in use` | Thêm `-p mp-learning-test` vào lệnh `docker compose` |
| `failed to connect to the docker API` | Mở Docker Desktop và chờ đến khi chạy xong |
| `Tài khoản chưa được cấp quyền` khi đăng ký | Email chưa có trong `LMS_ALLOWED_EMAILS` và chưa được mời vào tổ chức |
| Đăng nhập báo email chưa xác minh | Chạy lệnh SQL ở mục 3 (do chưa có SMTP) |
| Sửa `.env` nhưng không có tác dụng | Khởi động lại tiến trình tương ứng |
