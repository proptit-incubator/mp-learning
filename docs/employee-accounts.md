# Quản lý tài khoản nhân viên MP Learning

## Cấp tài khoản

Quản trị và L&D mở **Nhân viên** trong khu vực quản trị. HR và quản lý bộ phận mở **Nhân viên** và **Phân tích đào tạo** trong khu vực học tập. HR quản lý nhân viên không giữ vai trò nào; chỉ quản trị hệ thống được cấp hoặc thu hồi vai trò.

Chọn **Thêm nhân viên**, nhập mã nhân viên, họ tên, email, phòng ban, chức danh, ngày vào làm và quản lý trực tiếp. Chọn khóa học/chương trình nếu cần. **Lưu nháp** không gửi email. **Tạo và gửi kích hoạt** cấp hồ sơ và gửi liên kết để nhân viên tự đặt mật khẩu.

Mã nhân viên được chuẩn hóa thành chữ hoa, có tối đa 50 ký tự: chữ Latin, số, dấu chấm, gạch ngang hoặc gạch dưới. Mã nhân viên và email không thay đổi qua biểu mẫu sửa hồ sơ. Tài khoản cũ tiếp tục đăng nhập bằng email. Có thể thêm hồ sơ nhân viên cho thành viên cũ với cùng email và vai trò; việc này không thay mật khẩu hiện có.

Email vẫn bắt buộc để xác nhận chủ tài khoản, kích hoạt và khôi phục mật khẩu. Không tạo email giả cho nhân viên chưa có hộp thư.

## Kích hoạt và đăng nhập

Nhân viên mở thư kích hoạt, kiểm tra tên/mã được hiển thị, đặt mật khẩu và đăng nhập bằng **mã nhân viên hoặc email**. Nếu email đã có tài khoản, bước kích hoạt giữ mật khẩu cũ. Quên mật khẩu vẫn dùng địa chỉ email đã đăng ký.

Liên kết kích hoạt có hiệu lực 48 giờ, dùng một lần và chỉ lưu bản băm SHA-256 trong cơ sở dữ liệu. Gửi lại sẽ vô hiệu hóa liên kết trước. Tạm khóa/nghỉ việc cũng vô hiệu hóa các liên kết đang chờ. Tài khoản do HR quản lý phải dùng luồng kích hoạt, không đăng ký lại qua `/signup`.

Cấu hình SMTP theo [hướng dẫn triển khai](./mp-deployment.md). Khi gửi email lỗi, hồ sơ vẫn được lưu; giao diện thông báo riêng kết quả gửi để HR kiểm tra cấu hình và gửi lại. Không coi tài khoản đã tạo là email đã được gửi.

## Nhập danh sách

Nhập `.csv` hoặc `.xlsx`, tối đa 1.000 dòng và 5 MB. Các cột bắt buộc: `employeeCode`, `fullname`, `email`. Cột tùy chọn: `department`, `jobTitle`, `startDate` theo `YYYY-MM-DD`, `managerCode` là mã của quản lý đã hoạt động. Mã có số 0 ở đầu cần được lưu dưới dạng văn bản trong Excel.

Tài khoản nhập nhận vai trò Nhân viên. Các quyền cao hơn được cấp riêng bởi người đủ thẩm quyền. Có thể chọn khóa học/chương trình chung và gửi kích hoạt hoặc lưu nháp cho cả đợt.

Chạy **Kiểm tra danh sách** trước khi xác nhận. Dòng sai định dạng, trùng mã/email, quản lý không hợp lệ hoặc không có quyền sẽ có kết quả riêng. Khi xác nhận, trình duyệt xử lý từng nhóm nhỏ và hiển thị kết quả từng dòng; giữ trang mở đến khi hoàn tất. Nếu kết nối bị ngắt, kiểm tra danh sách và kết quả đã nhận trước khi thử lại. Nhập lại không ghi đè hay tạo trùng người đã có. Có thể tải các dòng lỗi để sửa.

## Phân quyền và vòng đời

Mỗi nhân viên giữ không, một hoặc nhiều vai trò; quyền là hợp của các vai trò đang giữ. Không giữ vai trò nào nghĩa là nhân viên thông thường.

| Quyền | Quản trị hệ thống | L&D | HR | Nhân viên |
| --- | --- | --- | --- | --- |
| Cấu hình hệ thống, cấp và thu hồi vai trò | ✓ | | | |
| Tài khoản nhân viên (tạo, nhập, sửa, khóa, nghỉ việc) | ✓ | | ✓ (chỉ nhân viên không giữ vai trò) | |
| Xem danh bạ nhân viên | ✓ | ✓ | ✓ | |
| Tạo, soạn, xuất bản mọi khóa; mẫu khóa, thẻ, thư viện tài liệu | ✓ | ✓ | | |
| Giao khóa, đổi hạn, miễn, thu hồi | ✓ | ✓ | ✓ | |
| Chấm bài, chứng chỉ | ✓ | ✓ | | |
| **Phân tích đào tạo** | Toàn tổ chức | Toàn tổ chức | Toàn tổ chức | |

Hai quyền không cần chọn vai trò:

- **Quản lý bộ phận**: ai được chọn làm *Quản lý trực tiếp* của ít nhất một nhân viên tự động xem danh sách, kết quả và Phân tích đào tạo của cấp dưới, kể cả cấp dưới gián tiếp.
- **Đội ngũ khóa**: quản trị hoặc L&D được thêm vào một khóa cụ thể thì soạn, chấm bài và quản lý lượt giao của khóa đó.

Vai trò chỉ được cấp ở trang **Nhân viên**. Trang Cài đặt → Quản trị viên & giảng viên, lời mời nhóm và liên kết mời đã bị gỡ.

Trạng thái tài khoản gồm **Chưa gửi kích hoạt**, **Chờ kích hoạt**, **Đang hoạt động**, **Tạm khóa**, **Đã nghỉ việc**. Khôi phục tài khoản chưa kích hoạt không bỏ qua việc xác nhận email. Người dùng không được tự khóa hoặc tự thay vai trò; phải duy trì ít nhất một quản trị hoạt động.

Tạm khóa/nghỉ việc thu hồi các phiên trong database. Cookie cache của Better Auth bị tắt để phiên đã thu hồi không tiếp tục xác thực từ cache. Kiểm tra trạng thái khi tạo phiên cũng áp dụng cho các phương thức đăng nhập cũ.

Khóa tài khoản giữ lại bài nộp, kết quả học, chứng chỉ và lịch sử thao tác. Lịch sử ghi người thực hiện, thời điểm và lý do thay trạng thái. Phòng ban/chức danh/quản lý phục vụ quản trị nội bộ; chưa có đồng bộ với phần mềm nhân sự bên ngoài hoặc SSO trong thay đổi này.

## Giao đào tạo và báo cáo

Nhân viên tham gia khóa học theo đúng hai cách: **Được giao** (quản trị hoặc HR/L&D giao, luôn phải hoàn thành, có thể có hạn và nhãn đợt đào tạo) hoặc **Tự đăng ký** từ Thư viện đào tạo. Mỗi lượt tham gia là một dòng `course_enrollment` gắn với nhân viên, nên có thể giao cho nhân viên chưa kích hoạt; khi họ kích hoạt, tư cách học viên của khóa được tạo trong cùng transaction. Có thể giao trước khóa chưa xuất bản. Học viên chỉ thấy khóa đã xuất bản.

Chi tiết nhân viên có bảng **Khóa học được giao** với trạng thái tính toán: Chưa bắt đầu, Đang học, Hoàn thành, Quá hạn, Hết hiệu lực, Miễn. Xuất danh sách áp dụng bộ lọc và phạm vi quyền đang có.

## Nâng cấp và kiểm tra

Áp dụng migration `0043_employee_accounts` theo luồng triển khai hiện hành trước khi chạy API mới. Migration `0047_recertification_cycles` thêm `course_completion_record.reopened_at` và bảng `course_cycle_archive`; các chu kỳ đã hết hiệu lực từ trước sẽ được job mở lại ở lần chạy kế tiếp. Migration `0046_employee_roles` thay cột `employee.role` bằng `employee.roles`: HR giữ HR, Quản trị giữ Quản trị, Giảng viên chuyển thành L&D; Quản lý bộ phận và Nhân viên thành không vai trò (quyền quản lý tự suy ra từ cấp dưới). Migration bổ sung bảng, không tạo sẵn mã nhân viên hoặc sửa tài khoản đang có. Kiểm tra `when` của journal cao hơn mọi migration trên nhánh main và không đặt trong tương lai.

Module có nội dung tiếng Việt/Anh. Các locale khác có đầy đủ khóa và tái sử dụng bản dịch sẵn có, dùng tiếng Anh dự phòng cho copy mới khi dịch vụ dịch chưa được cấu hình.

Kiểm thử tích hợp chỉ chạy khi đặt `EMPLOYEE_TEST_DATABASE_URL` trỏ tới database riêng có tên kết thúc `_test`, đã áp dụng schema/migration. Không dùng database đang phục vụ người dùng để chạy fixture:

```sh
pnpm --filter @cio/api exec vitest run src/__tests__/employee-accounts.integration.test.ts
```

Trước khi vận hành với dữ liệu thật, kiểm tra nhận thư qua SMTP thật và luồng HR tạo → nhân viên kích hoạt → đăng nhập bằng mã → học → HR khóa → phiên cũ bị từ chối.


## Học tự chọn và giao đào tạo

**Thư viện đào tạo** chỉ giới thiệu khóa đã xuất bản và đang cho phép tự đăng ký. Đóng tự đăng ký đưa khóa ra khỏi thư viện nhưng giữ quyền và tiến độ người đã tham gia.

**Khóa học của tôi** có ba tab: **Cần hoàn thành** (khóa được giao, xếp theo hạn), **Tự học** và **Đã hoàn thành**.

Giao khóa học bằng màn hình **Giao khóa học** dùng chung, mở từ tab Học viên của khóa (nút Thêm) hoặc từ trang Nhân viên (chọn nhiều người, hoặc lọc theo phòng ban/chức danh/tất cả). Chọn hạn, đợt đào tạo, lời nhắn và có gửi email hay không. Gửi lặp không tạo bản trùng và không đổi hạn đã có; dùng **Đổi hạn** trên từng lượt giao. **Miễn** ghi lý do và ngày hết miễn. **Thu hồi** chỉ chấm dứt quyền học, không xóa tiến độ, bài làm hoặc chứng chỉ.

Khóa bật **Học lại định kỳ** (Cài đặt → Quy tắc hoàn thành) ghi mỗi lần hoàn thành thành một chu kỳ có ngày hết hiệu lực. Mỗi ngày job `recertification-expiry-scan` mở chu kỳ mới cho mọi học viên (được giao hoặc tự đăng ký) có chu kỳ gần nhất đã hết hiệu lực và chưa được mở lại: đánh dấu chu kỳ cũ là đã mở lại (`reopened_at`), lưu bài nộp kèm câu trả lời của chu kỳ đó vào `course_cycle_archive`, rồi xóa tiến độ bài học, bài nộp và cờ hoàn thành. Lịch sử chu kỳ và chứng chỉ đã cấp được giữ nguyên. Lượt được giao nhận hạn mới (hết hiệu lực + 30 ngày) và email; lượt tự đăng ký không có hạn. Chu kỳ mới chỉ được ghi khi chu kỳ trước đã được mở lại, nên tiến độ cũ không tự gia hạn một chứng nhận đã hết hiệu lực. Job `assignment-due-reminder-scan` (08:00 giờ Việt Nam) nhắc 7 ngày trước hạn, đúng ngày hạn và mỗi thứ Hai khi quá hạn. Cả hai có thể kích hoạt thủ công qua `POST /internal/reminders/send-assignment-reminders` và `POST /internal/reminders/reopen-expired-recertifications`.

Triển khai cần chạy migration `0045_single_course_model.sql` bằng quy trình migration hiện có trước khi chạy mã mới. Migration chuyển phân công trực tiếp thành Được giao, tự đăng ký và dữ liệu không rõ nguồn thành Tự đăng ký, khóa Tuân thủ cũ thành khóa học lại định kỳ; đồng thời xóa Lớp đào tạo, Chương trình và loại khóa học.


## Course enrollment and employee emails

Course members can only be selected from active employees of the same organization. Search supports employee code, name, and email. New accounts must be created and activated in Employees. Administrators, L&D and HR assign learners; course team members adjust due dates, waive or revoke assignments of their courses; administrators and L&D add employees holding the ADMIN or LND role to a course team.

Course invitation creation and old course invitation links are retired, including acceptance of previously generated course share links. Course access notifications use the editable course access template and include the due date and training batch when set.

Email settings show employee activation, course access, assignment due reminders, recertification notices, and learning notifications. Obsolete course invitations, organization invitations, and payment proof templates remain in the internal registry for compatibility but are not editable or listed. Activation sends use the saved organization template, enforced language, branding, and a protected single-use 48-hour action link. Saved organization course access messages take priority over legacy course welcome text.

The translation command currently receives HTTP 401 from the configured RapidAPI provider. English and Vietnamese UI copy is maintained manually; the changed keys in other dashboard locales use English fallback copy. Activation email defaults are localized for every supported email language.
