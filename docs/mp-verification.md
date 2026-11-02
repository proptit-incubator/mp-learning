# Kiểm tra MP Learning — 23/10/2026

## Kết quả đã xác nhận

- Build các dependency, API, email và dashboard: thành công.
- 34 unit test: 12 kiểm tra endpoint ngừng sử dụng, 7 kiểm tra cấp quyền đăng ký, 15 kiểm tra đường dẫn nội bộ.
- Formatter trên toàn bộ file thay đổi: đạt. `git diff --check`: đạt.
- `pnpm format:check`: không có file staged; kết quả formatter phía trên được chạy riêng trên file thay đổi.
- PostgreSQL, Redis, SeaweedFS: healthy. Khởi tạo ba bucket: exit 0.
- Migration và seed dữ liệu tham chiếu trên database mới: thành công, không seed dữ liệu demo upstream.
- Đăng ký email ngoài danh sách cho phép: HTTP 403.
- Đăng ký quản trị bootstrap, đăng nhập: HTTP 200.
- Tạo tổ chức MP Transformation và khóa học tự học nội bộ: HTTP 201.
- Dashboard của quản trị với phiên đăng nhập hợp lệ: HTTP 200.
- Truy cập `/lms`, `/courses` khi chưa đăng nhập: HTTP 303 về đăng nhập.
- Landing page, widget và API danh mục công khai: HTTP 404.
- Logo MP được phục vụ từ thư mục static của ứng dụng: HTTP 200; không phụ thuộc thư mục assets tạm.

## Môi trường thử hiện tại

Mở http://localhost:3082/login. Tài khoản thử được lưu trong `.env.local` ở gốc repository (đã được Git bỏ qua). Đây là tài khoản thử, không dùng cho production.

API và dashboard đang chạy trực tiếp bằng Node trên máy; PostgreSQL, Redis và storage chạy trong Docker Compose project `mp-learning-test`, dùng volume riêng. Chưa chạy toàn bộ ứng dụng bằng Docker image. Các tiến trình Node cần được khởi động lại sau khi tắt máy; hướng dẫn triển khai Docker đầy đủ nằm trong `mp-deployment.md`.

Node kiểm tra là 24.14.0; repository yêu cầu 24.22.1 nên trình quản lý gói còn cảnh báo phiên bản. Các build nêu trên đã hoàn tất trên phiên bản hiện có.

## Phần cần nghiệm thu trước production

- Công cụ điều khiển trình duyệt bị tắt trong Work settings: chưa kiểm tra trực quan desktop/mobile trong phiên này.
- Chưa cấu hình SMTP: chưa nghiệm thu nhận thư mời, xác minh email và quên mật khẩu.
- Chưa chạy đầy đủ luồng nhân viên học, nộp bài, cấp chứng chỉ và xử lý video qua background worker.
- Chưa có domain, HTTPS, SMTP và storage endpoint production; chưa kiểm tra backup/restore trên hạ tầng doanh nghiệp.
- Bộ bản dịch mới có đủ 12 locale. Lệnh dịch tự động gặp giới hạn 429 với một số khóa cũ còn thiếu của upstream; các khóa MP mới đã được bổ sung và kiểm tra placeholder.

## Kiểm tra giao diện doanh nghiệp — 25/10/2026

- Build dependency dashboard (bao gồm DB, utils, core và API): đạt.
- Build dashboard production với `NODE_OPTIONS=--max-old-space-size=8192`: đạt; heap mặc định không đủ cho bundle hiện tại.
- 54 kiểm thử liên quan: 28 dashboard (ưu tiên khóa học, tìm kiếm tiếng Việt, trạng thái khóa được giao và route nội bộ), 19 API (đăng ký nội bộ, chặn endpoint công khai), 7 kiểm tra hợp đồng tìm kiếm thư viện: đạt.
- Story ScrollToTop biên dịch thành công, không có cảnh báo của Svelte compiler.
- Changed-file formatter, kiểm tra định dạng toàn bộ file thay đổi, `git diff --check` và kiểm tra prefix UI: đạt. `pnpm format:check` cũng được chạy; không có file staged.
- Các khóa dịch mới có đủ 12 locale; placeholder được đối chiếu với tiếng Anh. `pnpm translate vi` hoàn tất và không còn khóa mới bị thiếu.
- API thật: đăng nhập tài khoản thử thành công; catalog yêu cầu đăng nhập (401 khi thiếu phiên), từ chối trang phân số và kích thước vượt giới hạn (400), truy vấn tìm kiếm/sắp xếp trả thành công (200).
- Giữ nguyên database/migration, giấy phép, dữ liệu khóa học và cấu hình triển khai hiện hữu.

Môi trường xác minh dùng Node 24.14.0 đang cài trên máy; repo yêu cầu 24.22.1 nên vẫn có cảnh báo engine. Chưa xác minh lại bằng đúng bản vá 24.22.1. Các cảnh báo a11y và state của component upstream còn xuất hiện khi build; không có tuyên bố đã kiểm thử toàn bộ mọi màn hình hoặc đạt chứng nhận WCAG.

Ảnh và log QA cục bộ nằm trong `reports/mp-redesign/` (được Git bỏ qua). Không đưa tài khoản thử, cookie hay file `.env` vào commit.

Vòng Playwright cuối chạy trên bản production tại `http://localhost:3082` đã đạt:

- Đăng nhập nhân viên qua form thật; mở tổng quan và dữ liệu khóa học.
- Desktop 1440 px, mobile 390 px không tràn ngang, giao diện tối, reduced motion và ngưỡng hiện/ẩn nút về đầu trang.
- URL mở tab đào tạo bắt buộc, tìm kiếm không dấu và trạng thái không có kết quả.
- Tìm kiếm debounce và sắp xếp thư viện gọi API qua production proxy thành công.
- Học tiếp điều hướng tới bài học chưa hoàn thành và tải được nội dung.
- Tổng quan quản trị, danh sách khóa học và liên kết chia sẻ nội bộ ở cài đặt.
- Landing page khóa học cũ trả 404.
- Không ghi nhận `pageerror` ở các luồng trên; không phát sinh request `/ingest` của PostHog.

Kết quả máy đọc được: `reports/mp-redesign/verification.json`; ảnh desktop/mobile và log đầy đủ cùng thư mục. Chưa kiểm thử toàn bộ nghiệp vụ nộp bài/chấm điểm/cấp chứng chỉ hoặc hạ tầng email và worker production trong đợt này.
