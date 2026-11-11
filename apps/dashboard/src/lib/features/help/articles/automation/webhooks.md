---
title: Webhook
description: Nhận sự kiện của MP Learning theo thời gian thực, xác thực chữ ký và xử lý thử lại, tự động tắt.
order: 4
audience: Admin
---

Webhook gửi một yêu cầu HTTP `POST` có chữ ký đến URL của bạn mỗi khi sự kiện đã chọn xảy ra, ví dụ một nhân viên hoàn thành khóa học hay được cấp chứng chỉ.

## Tạo webhook

1. Mở **Tích hợp** → tab **Webhook**, bấm **Tạo webhook**.
2. Phần **Điểm nhận**:
   - **Tên**, ví dụ "Đồng bộ HRIS".
   - **URL nhận dữ liệu**: URL HTTPS, phải trả về mã `2xx` trong vòng 10 giây.
   - **Mã bí mật ký**: để trống để MP Learning tự tạo.
   - **Xác minh chứng chỉ SSL**: nên giữ bật.
   - **Bật**.
3. Phần **Sự kiện**: chọn **Gửi tất cả sự kiện** hoặc **Tự chọn từng sự kiện**.
4. Bấm **Lưu webhook**. Hộp **Mã bí mật ký mới của bạn** hiện mã bắt đầu bằng `whsec_`. Sao chép ngay, vì mã không hiện lại.

Mỗi tổ chức có tối đa 20 webhook. URL không được trỏ tới `localhost` hay mạng nội bộ, trừ khi đội vận hành bật `WEBHOOK_ALLOW_PRIVATE_NETWORKS=true` trên máy chủ (khi đó cũng chấp nhận `http`).

## Sự kiện

| Nhóm | Sự kiện |
|---|---|
| **Tổ chức** | `organization.invite.created`, `organization.invite.accepted`, `organization.invite.revoked`, `organization.member.added`, `organization.member.removed`, `organization.member.updated` |
| **Khóa học** | `course.member.added`, `course.member.removed`, `course.completed`, `course.certificate.issued`, `course.submission.created`, `course.submission.status_changed`, `course.published`, `course.unpublished` |
| **Tiến độ học tập** | `lesson.completion.updated`, `exercise.completion.updated`, `lesson.session.scheduled` |

Webhook mới chọn sẵn bốn sự kiện: `course.member.added`, `course.completed`, `course.certificate.issued` và `course.submission.created`.

> **Lưu ý:** Webhook tạo trước đây có thể còn lưu `course.invite.*` hoặc `course.payment_request.created`. MP Learning không phát các sự kiện này nên biểu mẫu không còn hiện chúng; khi bạn lưu lại webhook, chúng được bỏ đi.

## Payload

Mọi sự kiện dùng chung một vỏ JSON; nội dung `data` tùy loại sự kiện.

```json
{
  "id": "evt_01c9f0a8e2b14d7f9a3b5c6d7e8f9012",
  "type": "course.completed",
  "createdAt": "2026-10-13T12:15:30.000Z",
  "apiVersion": "2026-10-21",
  "organization": { "id": "…", "name": "MP Transformation", "siteName": "…" },
  "data": { "courseId": "…", "profileId": "…", "completedAt": "2026-10-13T12:15:30.000Z" }
}
```

Header đi kèm:

| Header | Nội dung |
|---|---|
| `X-Cio-Event` | Loại sự kiện |
| `X-Cio-Event-Id` | Mã sự kiện, giữ nguyên qua mọi lần thử lại và gửi lại |
| `X-Cio-Delivery` | Mã lượt gửi |
| `X-Cio-Webhook` | Mã webhook |
| `X-Cio-Timestamp` | Thời điểm ký, tính bằng giây Unix |
| `X-Cio-Signature-256` | `sha256=<hex>` |
| `webhook-id`, `webhook-timestamp`, `webhook-signature` | Cùng thông tin theo chuẩn Standard Webhooks |

## Xác thực chữ ký

Chữ ký là HMAC-SHA256 của chuỗi `<X-Cio-Timestamp>.<thân yêu cầu gốc>`, khóa là mã bí mật ký (dùng nguyên cả chuỗi `whsec_…`), mã hóa hex và thêm tiền tố `sha256=`. Hãy kiểm tra trên **thân gốc** trước khi parse JSON, và nên từ chối yêu cầu có thời điểm ký lệch quá 5 phút.

```js
import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.MP_WEBHOOK_SECRET; // whsec_...

function verifyMpWebhook(secret, timestamp, rawBody, signature) {
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`);
  const received = Buffer.from(signature ?? '');

  return expected.length === received.length && timingSafeEqual(expected, received);
}

const app = express();

app.post('/mp-learning/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const ok = verifyMpWebhook(SECRET, req.get('X-Cio-Timestamp'), rawBody, req.get('X-Cio-Signature-256'));
  if (!ok) return res.status(401).end();

  const event = JSON.parse(rawBody);
  // Dùng event.id để bỏ qua sự kiện đã xử lý.
  res.status(200).end();
});

app.listen(3000);
```

Nếu thư viện của bạn hỗ trợ Standard Webhooks, có thể kiểm tra header `webhook-signature` thay thế: chuỗi ký là `<webhook-id>.<webhook-timestamp>.<thân gốc>`, khóa là phần sau `whsec_` giải mã base64, kết quả có dạng `v1,<base64>`.

## Thử lại và tự động tắt

- Mỗi lượt gửi được thử tối đa 3 lần: ngay lập tức, sau 10 giây, rồi sau 1 phút. Mã ngoài `2xx`, quá 10 giây, hoặc chuyển hướng đều tính là lỗi.
- Một sự kiện có thể đến hơn một lần. Dùng `X-Cio-Event-Id` để không xử lý trùng.
- Sau 20 lượt gửi thất bại liên tiếp, webhook chuyển **Đang lỗi**. Sau 100 lượt, webhook **Tự động tắt**. Admin nhận email ở cả hai mốc. Sửa điểm nhận xong, bật lại công tắc **Bật** trong danh sách.

## Kiểm tra và gửi lại

Trong menu thao tác của mỗi webhook:

- **Gửi sự kiện thử**: gửi một sự kiện mẫu, không tính vào trạng thái lỗi.
- **Xem lượt gửi**: lịch sử 30 ngày, kèm header, payload, phản hồi và lỗi. Bấm **Gửi lại** để gửi lại một sự kiện với cùng mã sự kiện.
- **Tạo lại mã bí mật**: mã cũ ngừng hoạt động ngay.

Xem thêm: [Tổng quan tự động hóa và tích hợp](/help/automation/overview).
