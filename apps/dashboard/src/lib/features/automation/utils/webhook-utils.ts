import { WEBHOOK_DEFAULT_EVENT_TYPES, WEBHOOK_SUBSCRIBABLE_EVENT_TYPES } from '@cio/utils/constants/webhook';
import type { BadgeVariant } from '@cio/ui/base/badge';

import type { Webhook, WebhookDeliveryStatus, WebhookFormFields, WebhookHealth } from './types';

export const WEBHOOK_DELIVERIES_PAGE_SIZE = 10;

export const WEBHOOK_EVENT_GROUPS = [
  {
    key: 'organization',
    eventTypes: WEBHOOK_SUBSCRIBABLE_EVENT_TYPES.filter((type) => type.startsWith('organization.'))
  },
  { key: 'course', eventTypes: WEBHOOK_SUBSCRIBABLE_EVENT_TYPES.filter((type) => type.startsWith('course.')) },
  {
    key: 'learning',
    eventTypes: WEBHOOK_SUBSCRIBABLE_EVENT_TYPES.filter(
      (type) => type.startsWith('lesson.') || type.startsWith('exercise.')
    )
  }
] as const;

export const WEBHOOK_DELIVERY_STATUS_BADGE: Record<WebhookDeliveryStatus, BadgeVariant> = {
  PENDING: 'secondary',
  SUCCESS: 'success',
  FAILED: 'destructive',
  GAVE_UP: 'destructive'
};

export const WEBHOOK_HEALTH_BADGE: Record<WebhookHealth | 'retrying', BadgeVariant> = {
  healthy: 'success',
  retrying: 'warning',
  degraded: 'warning',
  disabled: 'destructive'
};

export function toWebhookEventTranslationKey(eventType: string): string {
  return eventType.replaceAll('.', '_');
}

export function getDefaultWebhookFormFields(): WebhookFormFields {
  return {
    name: '',
    payloadUrl: '',
    secret: '',
    verifySsl: true,
    eventMode: 'selected',
    eventTypes: [...WEBHOOK_DEFAULT_EVENT_TYPES],
    isActive: true
  };
}

function subscribableEventTypes(webhook: Webhook) {
  return webhook.eventTypes.filter((eventType) => WEBHOOK_SUBSCRIBABLE_EVENT_TYPES.some((type) => type === eventType));
}

export function toWebhookFormFields(webhook: Webhook): WebhookFormFields {
  return {
    name: webhook.name,
    payloadUrl: webhook.payloadUrl,
    secret: '',
    verifySsl: webhook.verifySsl,
    eventMode: webhook.eventMode,
    eventTypes: webhook.eventMode === 'all' ? [...WEBHOOK_DEFAULT_EVENT_TYPES] : subscribableEventTypes(webhook),
    isActive: webhook.isActive
  };
}

export function getWebhookEventsLabelCount(webhook: Webhook): number {
  return getWebhookEventTypes(webhook).length;
}

export function getWebhookEventTypes(webhook: Webhook): readonly string[] {
  return webhook.eventMode === 'all' ? WEBHOOK_SUBSCRIBABLE_EVENT_TYPES : subscribableEventTypes(webhook);
}

export function getWebhookDisplayHealth(webhook: Webhook): WebhookHealth | 'retrying' {
  const isRetrying = webhook.health === 'healthy' && !webhook.lastDeliveryAt && webhook.recentDeliveries.failed > 0;

  return isRetrying ? 'retrying' : webhook.health;
}

export function getWebhookErrorRate(webhook: Webhook): number | null {
  const { total, failed } = webhook.recentDeliveries;

  return total === 0 ? null : Math.round((failed / total) * 100);
}

export function getEventGroupSelection(
  selectedEventTypes: readonly string[],
  groupEventTypes: readonly string[]
): { isAllSelected: boolean; isPartiallySelected: boolean } {
  const selectedCount = groupEventTypes.filter((eventType) => selectedEventTypes.includes(eventType)).length;

  return {
    isAllSelected: selectedCount === groupEventTypes.length,
    isPartiallySelected: selectedCount > 0 && selectedCount < groupEventTypes.length
  };
}

export function getWebhookEventsCountKey(webhook: Webhook): string {
  return getWebhookEventsLabelCount(webhook) === 1
    ? 'automation.webhooks.events_count_one'
    : 'automation.webhooks.events_count_other';
}

export function formatWebhookTimestamp(value: string | null | undefined): string {
  if (!value) return '';

  return new Date(value).toLocaleString();
}
