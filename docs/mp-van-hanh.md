# Vận hành MP Learning

Tài liệu này dành cho người trực hệ thống. Cách cài đặt lần đầu nằm ở `docs/mp-deployment.md`.

## Sao lưu

Script `scripts/mp-backup.sh` sao lưu ba thứ vào `backups/mp-<thời gian>/`:

- `db.dump`: toàn bộ cơ sở dữ liệu (`pg_dump -Fc`).
- `storage.tar.gz`: kho file đi kèm (video, tài liệu, ảnh). Kho file được tạm dừng vài giây trong lúc đóng gói để bản sao không bị lệch.
- `manifest.txt`: thời điểm sao lưu, commit đang chạy và số migration đã áp dụng.

```bash
scripts/mp-backup.sh backup
```

Các biến môi trường:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `BACKUP_DIR` | `./backups` | Thư mục chứa bản sao lưu |
| `BACKUP_KEEP_DAYS` | `14` | Bản sao lưu cục bộ cũ hơn số ngày này sẽ bị xoá sau mỗi lần sao lưu |
| `BACKUP_REMOTE` | (trống) | Đích `rsync` trên máy khác, ví dụ `backup@nas:/srv/mp-learning` |

Bản sao lưu chỉ nằm trên máy chủ thì không bảo vệ được khi mất máy chủ. Luôn đặt `BACKUP_REMOTE`.

### Lịch chạy

Chạy hằng đêm bằng cron trên máy chủ:

```cron
30 2 * * * cd /srv/mp-learning && BACKUP_REMOTE=backup@nas:/srv/mp-learning scripts/mp-backup.sh backup >> /var/log/mp-backup.log 2>&1
```

Kiểm tra log mỗi tuần. Một dòng `Lỗi:` nghĩa là đêm đó không có bản sao lưu.

Nếu dùng S3 bên ngoài thay cho kho file đi kèm, script chỉ sao lưu cơ sở dữ liệu. Bật versioning hoặc sao chép bucket bằng công cụ của nhà cung cấp.

## Kiểm tra bản sao lưu

Lệnh dưới đây khôi phục bản dump vào một cơ sở dữ liệu tạm, đếm người dùng, khoá học và bài nộp, rồi xoá cơ sở dữ liệu tạm. Lệnh không đụng tới dữ liệu đang chạy.

```bash
scripts/mp-backup.sh verify backups/mp-20261103-010721
```

Chạy lệnh này mỗi tháng với bản sao lưu mới nhất ở máy khác. Mỗi quý, diễn tập khôi phục đầy đủ trên một máy thử theo mục dưới đây.

## Khôi phục

Khôi phục sẽ ghi đè cơ sở dữ liệu và kho file hiện tại. Script dừng `api`, `jobs` và `dashboard`, khôi phục dữ liệu, rồi khởi động lại các dịch vụ đó.

1. Báo người dùng hệ thống tạm ngưng.
2. Sao lưu trạng thái hiện tại trước, phòng khi cần quay lại: `scripts/mp-backup.sh backup`.
3. Chép bản cần khôi phục về `backups/` nếu nó đang ở máy khác.
4. Chạy:

   ```bash
   scripts/mp-backup.sh restore backups/mp-20261103-010721 --yes
   ```

5. Kiểm tra: đăng nhập bằng tài khoản quản trị, mở một khoá học có video, mở trang `/verify/<mã>` của một chứng chỉ.

Bản sao lưu được tạo từ code cũ hơn vẫn khôi phục được. API tự chạy các migration còn thiếu khi khởi động. Không khôi phục bản sao lưu từ code **mới hơn** code đang chạy. Hãy cập nhật code trước.

## Cập nhật phiên bản

MP Learning build image từ chính mã nguồn này. Không dùng `./classroomio.sh upgrade`, vì lệnh đó kéo image gốc của ClassroomIO và sẽ thay mất bản MP. Lệnh này đã bị chặn.

1. `scripts/mp-backup.sh backup`
2. `git pull` nhánh đang triển khai.
3. `docker compose --profile storage up -d --build api dashboard jobs`
4. `docker compose logs --tail 100 api` để xem migration đã chạy xong. API tự migrate khi khởi động.
5. Kiểm tra `docker compose ps` để chắc mọi dịch vụ đều ở trạng thái `healthy` hoặc `running`.

Nếu bản mới lỗi: checkout lại commit cũ (ghi trong `manifest.txt`), khôi phục bản sao lưu vừa tạo ở bước 1, rồi build lại.

## Sự cố thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| Không tải được chứng chỉ PDF | `docker compose logs api`. Image API phải có Chromium (`CHROMIUM_EXECUTABLE_PATH`). |
| Email giao khoá không gửi | `docker compose logs jobs` và cấu hình SMTP trong `.env`. |
| Dịch vụ dừng sau khi khởi động lại máy | Mọi dịch vụ dùng `restart: unless-stopped`. Chạy `docker compose --profile storage up -d`. |
| Hết dung lượng đĩa | Xoá bớt bản sao lưu cũ trong `backups/` hoặc giảm `BACKUP_KEEP_DAYS`. Dùng `docker system df` để xem image cũ. |
