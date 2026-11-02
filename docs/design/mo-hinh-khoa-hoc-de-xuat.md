# Đề xuất đơn giản hoá mô hình khoá học — MP Learning

Ngày: 01/11/2026. Phạm vi: cách một khoá học tồn tại, cách nhân viên được đưa vào khoá, và cách theo dõi nghĩa vụ hoàn thành. Không bàn về nội dung bài học, bài tập, chứng chỉ.

Tài liệu này thay thế toàn bộ các bản đề xuất trước đó trong `docs/design` (đã xoá).

---

## 1. Hiện trạng: vì sao rối

Kiểm kê từ mã nguồn (schema `packages/db/src/schema.ts`, API `apps/api`, giao diện `apps/dashboard`) và hướng dẫn sử dụng hiện hành cho thấy **cùng một câu hỏi "ai phải học khoá nào, đến bao giờ" đang được trả lời bằng 7 cơ chế chồng nhau**:

| # | Cơ chế | Nằm ở đâu | Ghi chú |
|---|---|---|---|
| 1 | **Loại khoá học** (`course.type`): Tự học, Buổi học trực tuyến, Tuân thủ, Công khai | Chọn khi tạo khoá, đổi được trong Cài đặt | Loại "Tuân thủ" đồng thời quyết định: cấm tự đăng ký, ẩn khỏi thư viện, ép bắt buộc, cấm đặt hạn khi giao, bật tab Tuân thủ. Loại "Công khai" là tàn dư của bản thương mại (landing page, thanh toán, đánh giá). |
| 2 | **Tự đăng ký** (`metadata.allowSelfEnrollment`) | Cài đặt khoá | Quyết định khoá có hiện trong Thư viện đào tạo hay không. |
| 3 | **Giao trực tiếp** (`course_enrollment_source` + `course_training_assignment`) | Tab Thành viên của khoá → "Giao đào tạo" | Có 2 mức: Bắt buộc / Khuyến nghị; có hạn hoàn thành; có lời nhắn. Hạn này **không có nhắc nhở email nào**, chỉ hiển thị. |
| 4 | **Hạn hoàn thành khoá học** (`certificate.deadline`) | Cài đặt khoá → Điều kiện hoàn thành | Một hạn khác, cấp khoá, dùng cho khoá Tuân thủ. Vậy là có 2 nơi đặt hạn. |
| 5 | **Lớp đào tạo** (cohort: ~9.400 dòng mã) | Menu riêng cho cả quản trị lẫn học viên | Gom khoá + người; có bảng tin riêng, link mời, QR, và **5 loại mục tiêu** (hoàn thành tất cả, N trên M, điểm, tỷ lệ đạt của nhóm, sẵn sàng) với **4 kiểu hạn** (không, ngày cố định, tính từ ngày vào lớp, định kỳ). Đây là nơi đặt hạn thứ 3. |
| 6 | **Tuân thủ** (compliance: ~3.300 dòng mã) | Tab trong khoá + trang báo cáo "Đào tạo bắt buộc" | Kỳ học lại, thời hạn hiệu lực, gia hạn, miễn trừ, 7 trạng thái. Nhưng các thiết lập (chu kỳ, ân hạn, khung HIPAA/OSHA…) **không có màn hình nào để sửa**, luôn là mặc định 12 tháng. Nhắc nhở chỉ ghi log, không gửi email. Đây là nơi đặt hạn thứ 4. |
| 7 | **Checkbox khoá/lớp trong hồ sơ nhân viên** (`employee_course`, `employee_cohort`) | Trang Nhân viên → thêm/sửa, nhập Excel | Một cách giao khoá thứ hai, song song với (3), ghi vào bảng khác, luôn là bắt buộc và không có hạn. |

Ngoài ra còn bảng **Chương trình** (`program*`, 7 bảng) không có giao diện, không có API, nhưng vẫn được JOIN trong mọi truy vấn quyền truy cập.

Hệ quả với người dùng:

- Người tạo khoá phải trả lời "khoá này loại gì?" trước khi biết sẽ dùng nó thế nào. Một khoá An toàn thông tin có thể vừa cần giao bắt buộc hàng năm cho toàn công ty, vừa cho người mới tự học trước.
- Học viên thấy 5 tab trong "Khoá học của tôi" (Đang học, Đào tạo bắt buộc, Được giao, Tự đăng ký, Đã hoàn thành) và nhãn nguồn như "Giao trực tiếp", "Nhóm đào tạo", "Kỳ đào tạo tuân thủ", "Dữ liệu cũ: chưa xác định nguồn". Họ chỉ cần biết: *tôi phải học gì, đến bao giờ*.
- Quản trị có 3 cửa để giao khoá (tab Thành viên, hồ sơ nhân viên, Lớp đào tạo) và 4 chỗ đặt hạn, nên báo cáo không khớp nhau.

---

## 2. Các LMS doanh nghiệp khác làm thế nào

Điểm chung của TalentLMS, Docebo, LearnUpon, Absorb, 360Learning, Moodle Workplace:

| Khái niệm | Cách phổ biến | Nhận xét |
|---|---|---|
| Khoá học | **Một loại duy nhất.** Khoá chứa bài học; buổi trực tuyến (ILT/webinar) là một *đơn vị nội dung* bên trong khoá. | Không hệ thống nào có "khoá tuân thủ" là một loại khoá. |
| Cách vào khoá | Đúng 2 đường: **được giao** (admin/quản lý/quy tắc tự động) hoặc **tự đăng ký** từ catalog. | Docebo gọi là enrollment rule + catalog; TalentLMS gọi là assign + course catalog. |
| Bắt buộc / hạn | Là **thuộc tính của việc giao**, không phải của khoá. Giao thì kèm hạn (hoặc không). | Người tự đăng ký không có hạn (Bigtincan, LearnUpon ghi rõ). |
| Định kỳ / tuân thủ | Là **thời hạn hiệu lực** của lần hoàn thành ("có giá trị N tháng"), hết hạn thì giao lại. | Moodle Workplace: certification + recertification; Docebo: validity period; TalentLMS: certificate expiry + re-assign. |
| Nhóm người | Giao theo phòng ban / vai trò / nhóm để giao hàng loạt, không phải một "lớp" có vòng đời riêng. | Cohort đúng nghĩa chỉ có ở LMS giáo dục (lớp theo học kỳ). |
| Lộ trình | Tuỳ chọn: một danh sách khoá có thứ tự, giao như một đơn vị. | Có thể thêm sau khi cần, không phải nền tảng. |

Kết luận: mô hình chuẩn ngành chỉ cần **Khoá học + Giao (có hạn, có thể định kỳ) + Tự đăng ký**. Mọi thứ khác là tiện ích bổ sung.

---

## 3. Mô hình đề xuất

### 3.1 Ba khái niệm, không hơn

```
Khoá học ──────────────── một loại duy nhất
   │   cài đặt: Cho phép tự đăng ký [bật/tắt]
   │             Học lại định kỳ   [tắt | mỗi N tháng]
   │
   ├── Được giao ──────── nhân viên × khoá, do L&D/quản lý tạo
   │     luôn phải hoàn thành
   │     hạn hoàn thành (tuỳ chọn)
   │     đợt đào tạo (nhãn, tuỳ chọn, ví dụ "Onboarding 11/2026")
   │     trạng thái: Chưa bắt đầu · Đang học · Hoàn thành · Quá hạn · Hết hiệu lực · Miễn
   │
   └── Tự đăng ký ─────── nhân viên tự bấm trong Thư viện
         không có nghĩa vụ, không có hạn
```

**Khoá học** không còn trường "loại". Buổi học trực tuyến đã là thuộc tính của *bài học* (bài học có `lesson_at`, `call_url`, thời lượng, bản ghi), nên tab Điểm danh và nhắc lịch chỉ cần hiện khi khoá có ít nhất một bài học dạng buổi trực tuyến. Không cần người dùng khai báo trước.

**Được giao** gộp 4 cơ chế hiện tại (giao trực tiếp, checkbox hồ sơ nhân viên, lớp đào tạo, kỳ tuân thủ) thành một bản ghi. Giao = phải hoàn thành. Bỏ mức "Khuyến nghị": nếu L&D muốn gợi ý, bật tự đăng ký và ghim khoá lên đầu thư viện.

**Tự đăng ký** giữ nguyên, nhưng là đường duy nhất tạo ra việc học không bắt buộc.

### 3.2 Hạn hoàn thành: đúng một chỗ

Hạn chỉ tồn tại trên **lần giao**. Bỏ "Hạn hoàn thành khoá học" ở Cài đặt khoá, bỏ hạn của mục tiêu lớp, bỏ hạn của kỳ tuân thủ.

Khi giao, người giao chọn ngày hạn (hoặc để trống). Khi giao cho nhiều người, tất cả nhận cùng một hạn. Nhắc nhở email tự động: 7 ngày trước hạn, đúng ngày hạn, và mỗi tuần khi quá hạn (chu kỳ này cấu hình ở Cài đặt tổ chức, không cấu hình từng khoá).

### 3.3 Đào tạo định kỳ thay cho "khoá Tuân thủ"

Một thiết lập trên khoá: **Học lại định kỳ: mỗi N tháng**. Khi bật:

- Mỗi lần hoàn thành có *hiệu lực đến* = ngày hoàn thành + N tháng.
- 30 ngày trước khi hết hiệu lực, lần giao chuyển sang "Sắp hết hiệu lực" (chỉ là hiển thị, không phải trạng thái lưu). Hết hiệu lực thì lần giao mở lại với hạn mới = ngày hết hiệu lực + số ngày mặc định (ví dụ 30), học viên thấy khoá quay lại mục "Cần hoàn thành".
- Lịch sử các chu kỳ giữ lại để báo cáo (bảng `course_completion_record` hiện có đáp ứng được, chỉ cần bỏ bớt cột).

Giữ lại 2 thao tác quản trị đang có vì hữu ích: **Gia hạn** (đổi hạn của lần giao) và **Miễn** (đánh dấu Miễn kèm lý do và ngày hết miễn). Bỏ: khung pháp lý (HIPAA/OSHA/…), ân hạn, giới hạn số lần làm lại, 7 trạng thái.

### 3.4 Giao hàng loạt thay cho Lớp đào tạo

Một màn hình "Giao khoá học" dùng chung, mở được từ 3 chỗ (trang Khoá học, tab Học viên của khoá, trang Nhân viên khi đã tick chọn người):

1. Chọn **khoá** (một hoặc nhiều).
2. Chọn **người**: tick từng nhân viên, hoặc lọc theo phòng ban / chức danh / "tất cả nhân viên đang hoạt động".
3. **Hạn hoàn thành** (tuỳ chọn), **Đợt đào tạo** (nhãn tự do, tuỳ chọn), **Lời nhắn**, ☑ Gửi email.

Nhãn "Đợt đào tạo" thay cho Lớp: lọc được ở báo cáo và tab Học viên ("Onboarding 11/2026: 18/24 hoàn thành"). Không có vòng đời riêng, không có bảng tin riêng (khoá đã có bảng tin), không có link mời/QR (nhân viên đã có tài khoản).

Bỏ 5 loại mục tiêu lớp. Lý do: "hoàn thành tất cả" chính là giao; "N trên M", "điểm ngưỡng", "tỷ lệ đạt của nhóm", "sẵn sàng" chưa thấy nhu cầu thật trong hướng dẫn sử dụng và tạo ra một tầng khái niệm thứ hai trên đầu khoá học. Nếu sau này cần "lộ trình" (một chuỗi khoá giao như một đơn vị, có thứ tự), thêm một thực thể *Lộ trình* nhẹ sẽ sạch hơn là giữ Lớp.

### 3.5 Hồ sơ nhân viên không giao khoá nữa

Bỏ phần "Giao khoá học và chương trình" (checkbox khoá, checkbox lớp) trong form thêm/sửa nhân viên và trong nhập Excel. Thay bằng nút "Giao khoá học" mở màn hình ở 3.4, và mục "Khoá học được giao" chỉ đọc trong hồ sơ.

Nhân viên **chưa kích hoạt** vẫn giao được (lần giao gắn với hồ sơ nhân viên, có hiệu lực khi họ đăng nhập lần đầu). Nhờ vậy không cần bảng `employee_course` làm "bản chờ".

---

## 4. Giao diện sau khi đơn giản hoá

### Học viên

| Màn hình | Trước | Sau |
|---|---|---|
| Menu | Tổng quan · Khoá học của tôi · Thư viện đào tạo · **Lớp đào tạo** · Bài tập · Chứng chỉ · Hỏi đáp | Tổng quan · Khoá học của tôi · Thư viện đào tạo · Bài tập · Chứng chỉ · Hỏi đáp |
| Khoá học của tôi | 5 tab: Đang học, Đào tạo bắt buộc, Được giao, Tự đăng ký, Đã hoàn thành | 3 tab: **Cần hoàn thành** (được giao, sắp xếp theo hạn, quá hạn nổi đỏ) · **Tự học** (tự đăng ký, chưa xong) · **Đã hoàn thành** |
| Thẻ khoá | Nhãn loại khoá + nhãn nguồn ("Giao trực tiếp", "Nhóm đào tạo · X", "Kỳ đào tạo tuân thủ") + Bắt buộc + hạn | Một dòng: "Được giao · hạn 30/11" hoặc "Tự đăng ký"; thêm "Hiệu lực đến 05/2027" nếu khoá định kỳ |
| Thư viện | Khoá cho tự đăng ký; khoá Tuân thủ ẩn | Khoá cho tự đăng ký; khoá đã được giao hiện kèm nhãn "Đã được giao" để vào học luôn |
| Tổng quan | 4 ô số + khoá tiếp tục + bắt buộc + buổi sắp tới + gợi ý | Giữ, nhưng ô "Bắt buộc" thành "Cần hoàn thành" và "Quá hạn" |

### Quản trị

| Màn hình | Trước | Sau |
|---|---|---|
| Menu | … Khoá học · **Lớp đào tạo** · … · Phân tích · **Đào tạo bắt buộc** · … | … Khoá học · … · Phân tích (có mục Đào tạo được giao) · … |
| Tạo khoá | Bước 1 chọn loại (3 thẻ), bước 2 tên/mô tả | Chỉ tên + mô tả |
| Danh sách khoá | Lọc theo loại, trạng thái, thẻ | Lọc theo trạng thái (nháp/đã xuất bản), thẻ; cột "Tự đăng ký" bật/tắt |
| Cài đặt khoá | Chung · **Loại khoá học** · Điều kiện hoàn thành (tiến trình + **hạn**) · **Nhắc buổi trực tuyến** · Nội dung · **Callout** · Quyền truy cập · Mẫu · Xoá | Chung · **Tham gia** (☐ Cho phép tự đăng ký · Học lại định kỳ: [tắt / mỗi __ tháng] · Thứ tự học: tự do/tuần tự) · Nội dung · Quyền tải · Mẫu · Xoá |
| Tab trong khoá | Bảng tin · Nội dung · Chứng chỉ · Phân tích · Bài nộp · Điểm · Thành viên · **Tuân thủ** · **Điểm danh** (nếu LIVE) · Trợ giảng AI · Cài đặt | Như cũ, bỏ Tuân thủ; Điểm danh tự hiện khi có buổi trực tuyến |
| Tab Thành viên | Người học / Đội ngũ / Lịch sử; cột Nguồn tham gia với hộp thoại nhiều nguồn; nút Giao đào tạo (Bắt buộc/Khuyến nghị, hạn, lời nhắn) | **Học viên** / **Đội ngũ**; cột "Cách tham gia": "Được giao bởi A · hạn 30/11 · đợt Onboarding 11/2026" hoặc "Tự đăng ký"; thao tác: Đổi hạn · Miễn · Thu hồi; nút **Giao khoá học** (màn hình 3.4) |
| Nhân viên | Form có checkbox khoá + lớp | Form không có; nút Giao khoá học; hồ sơ có bảng "Khoá học được giao" |
| Báo cáo | Phân tích + trang Đào tạo bắt buộc riêng (7 trạng thái) | Một trang Phân tích với mục **Đào tạo được giao**: theo khoá / theo nhân viên / theo đợt; trạng thái: Chưa bắt đầu · Đang học · Hoàn thành · Quá hạn · Hết hiệu lực · Miễn; xuất CSV |

---

## 5. Mô hình dữ liệu đích

Chỉ nêu phần thay đổi.

**`course`**
- Bỏ: `type`, `compliance`, `callout`, `cost`, `currency`, `public_for_all`, `certificate.deadline`.
- Thêm: `recertification_months integer null` (null = không định kỳ).
- Giữ: `metadata.allowSelfEnrollment`.

**`course_enrollment`** (gộp `course_enrollment_source` + `course_training_assignment`)
| Cột | Ý nghĩa |
|---|---|
| `course_id`, `employee_id` | gắn với nhân viên, không phải profile, để giao được trước khi kích hoạt |
| `kind` | `ASSIGNED` \| `SELF` |
| `assigned_by`, `message`, `batch_label` | chỉ có khi ASSIGNED |
| `due_date` | chỉ có khi ASSIGNED, có thể null |
| `status` | `ACTIVE` \| `WAIVED` \| `REVOKED`; kèm `waived_by`, `waiver_reason`, `waiver_expires_at`, `revoked_at`, `revoked_by` |
| ràng buộc | một dòng ACTIVE cho mỗi (course, employee, kind) |

Dữ liệu cũ: `DIRECT` → `ASSIGNED`; `SELF` → `SELF`; `LEGACY` (thành viên có trước khi có bảng nguồn) → `SELF`, vì không nên tự tạo nghĩa vụ cho dữ liệu không rõ nguồn; L&D giao lại nếu cần. `employee_course` được gộp vào ASSIGNED rồi xoá bảng.

**`course_completion_record`** → giữ làm lịch sử chu kỳ: `course_id`, `employee_id`, `cycle_number`, `completed_at`, `valid_until`, `score`. Bỏ `status`, `due_date`, `grace`, `waiver_*` (chuyển sang `course_enrollment`). Chỉ ghi chu kỳ mới khi khoá có `recertification_months`.

**`course_completion_notification_event`** → giữ, dùng làm khoá chống gửi trùng cho nhắc hạn.

**Xoá hẳn**: `program`, `program_course`, `program_member`, `program_newsfeed`, `program_newsfeed_comment`, `program_goal`, `program_goal_assignment`, `cohort`, `cohort_course`, `cohort_member`, `cohort_newsfeed`, `cohort_newsfeed_comment`, `cohort_goal`, `cohort_goal_assignment`, `employee_course`, `employee_cohort`, enum `COURSE_TYPE`, giá trị `COHORT` của `INVITE_LINK_RESOURCE_TYPE`.

Trạng thái của một lần giao là **tính toán**, không lưu: Miễn (status WAIVED) → Hoàn thành (có completion còn hiệu lực) → Hết hiệu lực (completion đã quá `valid_until`) → Quá hạn (`due_date` < hôm nay) → Đang học (có tiến độ) → Chưa bắt đầu.

---

## 6. Những gì bị cắt và lý do

| Cắt | Lý do |
|---|---|
| Loại khoá học (4 giá trị) | Loại không mô tả nội dung mà mô tả cách dùng; cách dùng đã nằm ở "giao"/"tự đăng ký". |
| Loại Công khai, callout, thanh toán, đánh giá | LMS nội bộ, không có người ngoài. |
| Mức "Khuyến nghị" khi giao | Tạo trạng thái thứ ba "được giao nhưng không bắt buộc" khó giải thích; thư viện + tự đăng ký đã là kênh gợi ý. |
| Hạn ở Cài đặt khoá | Trùng với hạn khi giao. |
| Lớp đào tạo (toàn bộ) | Trong thực tế là "giao nhiều khoá cho nhiều người cùng lúc" + nhãn; mục tiêu/bảng tin/QR là gánh nặng. |
| Chương trình (bảng) | Không có giao diện, chỉ còn trong truy vấn. |
| Tab Tuân thủ, trang Đào tạo bắt buộc, khung pháp lý, ân hạn, 7 trạng thái | Thay bằng thiết lập định kỳ + báo cáo Đào tạo được giao. |
| Checkbox khoá/lớp trong hồ sơ nhân viên | Đường giao thứ hai, không hạn, không ai biết nó là "bắt buộc". |
| Nhãn "Dữ liệu cũ: chưa xác định nguồn" | Học viên không cần biết. |

Những gì **giữ**: tự đăng ký, giao có hạn, lời nhắn khi giao, lịch sử chu kỳ học lại, gia hạn, miễn, thu hồi, điểm danh cho buổi trực tuyến, chứng chỉ, nhắc lịch buổi trực tuyến (dùng mặc định toàn hệ thống), tiến trình tuần tự/tự do.

Những gì **thêm**: nhắc hạn qua email (hiện không có), giao theo phòng ban/chức danh, nhãn đợt đào tạo, khoá đã giao hiện trong thư viện.

---

## 7. Lộ trình thực hiện

Ba giai đoạn, mỗi giai đoạn phát hành được riêng.

**Giai đoạn 1 — Giao diện và thuật ngữ** (không đổi schema)
- Bỏ bước chọn loại khi tạo khoá (mặc định Tự học). Ẩn ô Loại khoá học trong Cài đặt.
- Bỏ "Khuyến nghị" trong form giao; `required` luôn true.
- Ẩn phần checkbox khoá/lớp trong form nhân viên; thêm nút Giao khoá học.
- Khoá học của tôi còn 3 tab; thẻ khoá hiện một dòng cách tham gia.
- Ẩn menu Lớp đào tạo và Đào tạo bắt buộc nếu tổ chức chưa có dữ liệu ở đó (có thì giữ tạm để không mất việc đang chạy).
- Tab Điểm danh hiện theo "có bài học trực tuyến" thay vì theo loại.

**Giai đoạn 2 — Mô hình dữ liệu mới**
- Tạo `course_enrollment`, chuyển dữ liệu từ 3 bảng cũ; thêm `recertification_months`; thêm `batch_label`.
- Màn hình Giao khoá học dùng chung + lọc theo phòng ban/chức danh.
- Job nhắc hạn (7 ngày, đúng hạn, quá hạn hàng tuần) và job mở lại chu kỳ khi hết hiệu lực.
- Báo cáo Đào tạo được giao trong Phân tích.
- Bỏ mọi nhánh `course.type === 'COMPLIANCE' | 'LIVE_CLASS' | 'PUBLIC'` trong API/core (khoảng 150 vị trí trong 60 tệp, phần lớn là test).

**Giai đoạn 3 — Dọn dẹp**
- Xoá module Lớp đào tạo, Tuân thủ, các bảng Chương trình, `employee_course`/`employee_cohort`, enum `COURSE_TYPE`, các tuyến API và scope MCP liên quan.
- Cập nhật hướng dẫn sử dụng (các mục 4.3, 10.9, 12.6, 13.1, 14.2).

Giai đoạn 1 có thể làm ngay. Giai đoạn 2 cần chốt mục 8.

---

## 8. Cần xác nhận trước giai đoạn 2

1. **Lớp đào tạo đang có dữ liệu thật không?** Nếu có lớp đang chạy với mục tiêu N trên M hoặc tỷ lệ đạt của nhóm, cần biết để chuyển thành các lần giao + nhãn đợt.
2. **Buổi học trực tuyến có dùng thật không?** Nếu không, có thể bỏ luôn Điểm danh và nhắc lịch để gọn thêm.
3. **Có cần giao tự động cho nhân viên mới** theo phòng ban/chức danh (quy tắc chạy ngầm, kiểu "ai vào phòng Kinh doanh thì tự nhận 3 khoá")? Đề xuất: chưa, giao thủ công theo bộ lọc là đủ cho quy mô hiện tại; thêm sau nếu HR yêu cầu.
4. **Thời hạn mặc định khi học lại định kỳ** (đề xuất 30 ngày sau khi hết hiệu lực) và **chu kỳ nhắc** (đề xuất 7 ngày trước, đúng hạn, mỗi tuần khi quá hạn).

---

## 9. Trạng thái triển khai (02/11/2026)

Đã triển khai thẳng mô hình đích trong một migration (`0045_single_course_model.sql`) vì dữ liệu hiện có là dữ liệu thử.

Khác với đề xuất ban đầu ở vài điểm nhỏ:

- Thiết lập **Học lại định kỳ** nằm trong thẻ *Quy tắc hoàn thành* của Cài đặt khóa, cạnh thứ tự học; công tắc tự đăng ký vẫn ở thẻ *Quyền truy cập*.
- Bỏ luôn phần định giá/thanh toán và loại khóa *Công khai* (trang khóa công khai, nút thanh toán).
- Giao khóa theo phòng ban/chức danh là giao một lần theo danh sách lúc giao, không phải quy tắc tự động cho nhân viên mới.

### Hướng dẫn sử dụng cần cập nhật

File PDF `docs/MP-Learning-Huong-dan-su-dung.pdf` không có nguồn trong repo. Các mục cần viết lại:

| Mục | Nội dung cần sửa |
|---|---|
| 4.1 Khóa học của tôi | Ba tab Cần hoàn thành / Tự học / Đã hoàn thành |
| 4.3 Lớp đào tạo | Bỏ |
| 10.2 Tạo khóa học mới | Không còn chọn loại khóa |
| 10.8 Cài đặt khóa học | Bỏ Loại khóa học và Hạn hoàn thành khóa; thêm Học lại định kỳ |
| 10.9 Thiết lập khóa bắt buộc (Tuân thủ) | Thay bằng Giao khóa học + Học lại định kỳ |
| 11.1 Thành viên | Cột Cách tham gia; Đổi hạn / Miễn / Thu hồi |
| 12.6 Học viên | Giao khóa học từ trang Nhân viên |
| 13.1 Lớp đào tạo | Bỏ; thay bằng Đợt đào tạo khi giao |
| 14.2 Đào tạo bắt buộc | Thay bằng mục Đào tạo được giao trong Phân tích |
