import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getActiveOrganizationPlan: vi.fn()
}));

vi.mock('@cio/db/queries/organization', () => ({
  getActiveOrganizationPlan: mocks.getActiveOrganizationPlan
}));

import { hasWebhookEntitlement } from '@cio/core/services/webhook/entitlement';

const orgId = '22222222-2222-4222-8222-222222222222';

describe('hasWebhookEntitlement on MP Learning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([['BASIC'], ['EARLY_ADOPTER'], [null]])(
    'allows webhooks whatever plan row the organization carries (%s)',
    async (planName) => {
      mocks.getActiveOrganizationPlan.mockResolvedValue(planName ? { planName } : null);

      expect(await hasWebhookEntitlement(orgId)).toBe(true);
    }
  );
});
