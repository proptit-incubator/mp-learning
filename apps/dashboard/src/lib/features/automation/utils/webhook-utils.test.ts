import { describe, expect, it } from 'vitest';
import {
  WEBHOOK_EVENT_GROUPS,
  getDefaultWebhookFormFields,
  getWebhookEventTypes,
  toWebhookFormFields
} from './webhook-utils';
import type { Webhook } from './types';

const RETIRED = [
  'course.invite.created',
  'course.invite.accepted',
  'course.invite.revoked',
  'course.payment_request.created'
];

const webhook = (overrides: Partial<Webhook>) =>
  ({
    name: 'HRIS',
    payloadUrl: 'https://hris.mp.test/hook',
    verifySsl: true,
    eventMode: 'selected',
    eventTypes: ['course.completed', 'course.invite.accepted'],
    isActive: true,
    ...overrides
  }) as Webhook;

describe('webhook events offered in the form', () => {
  it('never offers or preselects an event MP Learning does not emit', () => {
    const offered = WEBHOOK_EVENT_GROUPS.flatMap((group) => [...group.eventTypes]);

    expect(offered).toContain('course.completed');
    expect(offered.filter((eventType) => RETIRED.includes(eventType))).toEqual([]);
    expect(getDefaultWebhookFormFields().eventTypes.filter((eventType) => RETIRED.includes(eventType))).toEqual([]);
  });

  it('drops retired events from an existing webhook when it is edited or listed', () => {
    const stored = webhook({});

    expect(toWebhookFormFields(stored).eventTypes).toEqual(['course.completed']);
    expect(getWebhookEventTypes(stored)).toEqual(['course.completed']);
    expect(getWebhookEventTypes(webhook({ eventMode: 'all' }))).not.toContain('course.payment_request.created');
  });
});
