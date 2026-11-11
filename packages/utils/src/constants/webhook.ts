export const WEBHOOK_EVENT_TYPES = [
  'organization.invite.created',
  'organization.invite.accepted',
  'organization.invite.revoked',
  'course.invite.created',
  'course.invite.accepted',
  'course.invite.revoked',
  'course.member.added',
  'course.member.removed',
  'course.completed',
  'course.certificate.issued',
  'course.submission.created',
  'course.submission.status_changed',
  'lesson.completion.updated',
  'exercise.completion.updated',
  'organization.member.added',
  'organization.member.removed',
  'organization.member.updated',
  'course.published',
  'course.unpublished',
  'lesson.session.scheduled',
  'course.payment_request.created'
] as const;
export type TWebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

const WEBHOOK_RETIRED_EVENT_TYPES: readonly TWebhookEventType[] = [
  'course.invite.created',
  'course.invite.accepted',
  'course.invite.revoked',
  'course.payment_request.created'
];

/** Events MP Learning emits and offers for subscription. The retired ones stay valid in stored endpoints only. */
export const WEBHOOK_SUBSCRIBABLE_EVENT_TYPES: readonly TWebhookEventType[] = WEBHOOK_EVENT_TYPES.filter(
  (eventType) => !WEBHOOK_RETIRED_EVENT_TYPES.includes(eventType)
);

export const WEBHOOK_DEFAULT_EVENT_TYPES: readonly TWebhookEventType[] = [
  'course.member.added',
  'course.completed',
  'course.certificate.issued',
  'course.submission.created'
];

export const WEBHOOK_MEMBER_SOURCE_METHODS = [
  'invite',
  'invite_link',
  'self_enroll',
  'import',
  'api',
  'sso',
  'payment',
  'admin'
] as const;
export type TWebhookMemberSourceMethod = (typeof WEBHOOK_MEMBER_SOURCE_METHODS)[number];

export const WEBHOOK_EVENT_MODES = ['all', 'selected'] as const;
export type TWebhookEventMode = (typeof WEBHOOK_EVENT_MODES)[number];

export const WEBHOOK_DELIVERY_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'GAVE_UP'] as const;
export type TWebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

export const WEBHOOK_ENDPOINT_HEALTH = ['healthy', 'degraded', 'disabled'] as const;
export type TWebhookEndpointHealth = (typeof WEBHOOK_ENDPOINT_HEALTH)[number];

export const WEBHOOK_MAX_ATTEMPTS = 3;
export const WEBHOOK_RETRY_DELAYS_MS = [10_000, 60_000] as const;
export const WEBHOOK_REQUEST_TIMEOUT_MS = 10_000;
export const WEBHOOK_DEGRADED_FAILURE_THRESHOLD = 20;
export const WEBHOOK_AUTO_DISABLE_FAILURE_THRESHOLD = 100;
export const WEBHOOK_RETENTION_DAYS = 30;
export const WEBHOOK_RESPONSE_BODY_LIMIT = 2_048;
export const WEBHOOK_MAX_ENDPOINTS_PER_ORG = 20;
export const WEBHOOK_API_VERSION = '2026-10-21';

export const WEBHOOK_SIGNATURE_HEADER = 'X-Cio-Signature-256';
export const WEBHOOK_TIMESTAMP_HEADER = 'X-Cio-Timestamp';
export const WEBHOOK_STANDARD_ID_HEADER = 'webhook-id';
export const WEBHOOK_STANDARD_TIMESTAMP_HEADER = 'webhook-timestamp';
export const WEBHOOK_STANDARD_SIGNATURE_HEADER = 'webhook-signature';
