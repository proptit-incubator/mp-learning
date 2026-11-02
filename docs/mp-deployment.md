# Triển khai MP Learning

MP Learning là bản tùy biến ClassroomIO cho đào tạo nội bộ MP Transformation. Giữ nguyên `LICENSE` và thông tin nguồn gốc upstream. Các tên package `@cio/*`, cookie và migration vẫn giữ để không phá tương thích dữ liệu.

## Phạm vi

- Một đơn vị MP Transformation cố định, tự triển khai. Các API tạo tổ chức, onboarding SaaS, workspace, tên miền và gói cước trả 404. API cập nhật chỉ nhận cài đặt vận hành, không nhận thay đổi nhận diện. Giữ khóa học, bài học, bài tập, chương trình đào tạo, chứng chỉ, cộng đồng, nhân viên, phân quyền và báo cáo.
- Xóa ứng dụng quảng bá `apps/website`. Trang `/` chuyển đến đăng nhập. Các trang landing-page editor, widget, tích hợp bán SaaS, tên miền và billing bị chặn ở máy chủ, đồng thời bỏ khỏi menu chính.
- Các API công khai `/org-site/*`, `/widgets/*` và catalog công khai trả 404. Nội dung học trong dashboard yêu cầu phiên đăng nhập; quyền truy cập khóa học tiếp tục do các API hiện có kiểm tra.
- AI mặc định tắt; Google chỉ hiển thị khi cấu hình rõ ràng. Không thay đổi cơ chế giấy phép của các tính năng Enterprise upstream.
- Logo và nền đã nằm trong `apps/dashboard/static/brand`; có thể xóa thư mục `assets` sau khi kiểm tra tài nguyên.
- Các module landing-page dùng chung được giữ trong thư viện để không phá dependency; không đưa chúng vào luồng người dùng nội bộ.

## Chuẩn bị

Cài Docker Engine + Compose, hoặc Docker Desktop đang chạy. Build từ source bằng `docker-compose.yaml`; không dùng `docker-compose.images.yaml` vì file đó chạy image ClassroomIO gốc. Dockerfile ghim Node 24.22.1 và pnpm 10.19.0. Máy build cần đủ RAM cho monorepo (Dockerfile đặt heap Node tối đa khoảng 8 GB).

```sh
node scripts/setup-mp.mjs --email admin@your-company.vn --origin https://learning.your-company.vn
```

Script chỉ tạo `.env` khi chưa có file; không ghi đè cấu hình và không in secret. Email quản trị phải là email thực của người quản lý đào tạo. Với máy local dùng `--origin http://localhost:3082`.

Trước khi đưa vào sử dụng, chỉnh `.env`:

1. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SENDER`: hộp thư gửi email xác minh, đặt lại mật khẩu, lời mời. Cấu hình được truyền cho cả API và worker.
2. `DASHBOARD_ORIGIN`, `PUBLIC_SERVER_URL`, `TRUSTED_ORIGINS`: cùng origin HTTPS của LMS. Dashboard proxy API qua cùng origin; `PRIVATE_SERVER_URL` vẫn là `http://api:3081`.
3. `OBJECT_STORAGE_PUBLIC_ENDPOINT`: origin HTTPS của S3 proxy mà trình duyệt truy cập được; `OBJECT_STORAGE_MEDIA_PUBLIC_BASE_URL` là origin đó cộng `/media`. Không giữ `localhost` khi triển khai. Cập nhật `CSP_MEDIA_SRC_DOMAINS` theo hostname lưu trữ nếu cần.
4. Không đặt secret hoặc dữ liệu nhân viên vào các biến `PUBLIC_*`.

```sh
docker compose --profile storage config --quiet
docker compose --profile storage up -d --build
docker compose ps
docker compose logs --tail 100 api dashboard jobs
```

API tự chạy migration và seed dữ liệu tham chiếu khi khởi động. Không chạy seed demo trên production. Không đổi tên database/volume của hệ thống đang có dữ liệu.

Sao lưu, khôi phục và cập nhật phiên bản: xem `docs/mp-van-hanh.md`. Không dùng `./classroomio.sh upgrade`.

## Chứng chỉ và file PDF

Chứng chỉ (PDF/PNG) và file PDF khóa học được dựng bằng Chromium cài sẵn trong image API, không gọi dịch vụ bên ngoài. Image cài `chromium`, `fonts-noto-core` và bộ font tự host trong `docker/fonts` (Be Vietnam Pro, Noto Serif Display, Cormorant, Archivo, Playfair Display, Space Grotesk, JetBrains Mono — đều có bộ ký tự tiếng Việt, giấy phép OFL). Khi chạy API ngoài Docker, đặt `CHROMIUM_EXECUTABLE_PATH` trỏ tới Chrome/Chromium trên máy.

Mỗi chu kỳ hoàn thành có một chứng chỉ với mã tra cứu 10 ký tự. Tên, mã nhân viên, ngày cấp và hiệu lực lấy từ dữ liệu đã lưu. Ai có mã đều kiểm tra được tại `/verify/{mã}` mà không cần đăng nhập; trang chỉ hiện tên, mã nhân viên, khóa học, ngày cấp, hiệu lực và trạng thái.

## HTTPS và mạng

Các cổng PostgreSQL, Redis, API, dashboard và storage được bind localhost. Đặt reverse proxy HTTPS trên host: LMS trỏ tới `127.0.0.1:3082`, storage trỏ tới `127.0.0.1:9000`. Chuyển tiếp host/protocol đúng; cấu hình giới hạn request đủ cho video. Không expose cổng 5432/6379/3081 ra Internet. Nếu reverse proxy chạy trong Docker, nối nó vào cùng network và dùng tên service thay vì localhost.

Ảnh trong bucket media vốn được phục vụ công khai bởi storage upstream. Không dùng bucket này cho tài liệu mật. Với yêu cầu chỉ truy cập trong mạng doanh nghiệp, đặt cả LMS và storage sau VPN hoặc kiểm soát truy cập mạng của doanh nghiệp. Tài liệu/video cần kiểm thử URL ký số với endpoint HTTPS thực trước khi nghiệm thu.

## Tài khoản đầu tiên và nhân viên

1. Mở `/signup` bằng email trong `LMS_ALLOWED_EMAILS`. Danh sách này nên chỉ chứa người được phép bootstrap; không dùng wildcard.
2. Đăng nhập bằng email được cấp phép: hệ thống tự khởi tạo MP Transformation (`mp-transformation`), tiếng Việt và tài khoản quản trị trong một giao dịch. Các lần đăng nhập đồng thời được tuần tự hóa; chỉ tài khoản khởi tạo thành công được cấp quyền quản trị. Nếu đã có dữ liệu, hệ thống giữ đơn vị đầu tiên cùng ID, mã và các quan hệ hiện hữu; không xóa hay gộp dữ liệu của đơn vị khác.
3. Vào Cài đặt → Cấu hình đào tạo để thiết lập ngôn ngữ và tính năng học tập. Thương hiệu MP Transformation được cố định. Thêm giảng viên/quản trị bằng quyền phù hợp, quản lý tài khoản nhân viên qua chức năng Nhân viên.
4. Hook tạo user kiểm tra email được cấp phép, thành viên đã được thêm hoặc lời mời còn hiệu lực. Áp dụng cả đăng ký email và tài khoản mới qua OAuth. Nhân viên phải xác minh email trước khi đăng nhập bằng mật khẩu. Chỉ ẩn nút trên UI không phải cơ chế kiểm soát này.
5. Sau bootstrap có thể để `LMS_ALLOWED_EMAILS` trống và restart API; người mới phải có lời mời hoặc membership. Biến này không thu hồi tài khoản hiện hữu. Dùng quản trị người dùng để thu hồi truy cập nhân viên nghỉ việc.

## Nghiệm thu trên môi trường thật

- Quản trị: đăng nhập → tạo khóa học → thêm nội dung → mời nhân viên → theo dõi tiến độ.
- Nhân viên: xác minh email → đăng nhập → chỉ thấy khóa học được phép → làm bài tập → nhận chứng chỉ.
- Thử đăng ký email lạ trực tiếp qua API; phải bị từ chối. Thử lời mời hết hạn/đã thu hồi và truy cập bài học khi chưa đăng nhập.
- Kiểm tra reset mật khẩu, gửi email worker, tải file/video, URL ký số, mobile, vai trò tutor/student và API direct access.
- Sao lưu PostgreSQL và object storage theo chính sách doanh nghiệp; thử restore trên môi trường riêng trước khi vận hành. Giữ secret trong hệ thống quản lý secret và không commit `.env`.

Build và unit test không thay thế kiểm thử này. Không có tài khoản máy chủ, domain hay SMTP production được cung cấp trong phiên chỉnh sửa source.
