import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: { PUBLIC_IS_SELFHOSTED: 'true' as string | undefined },
  getActiveOrganizationPlan: vi.fn()
}));

vi.mock('@cio/core/config/env', () => ({ env: mocks.env }));
vi.mock('@cio/db/queries/organization', () => ({ getActiveOrganizationPlan: mocks.getActiveOrganizationPlan }));

import { getEffectiveOrgPlanName } from '@cio/core/services/organization/plan';

describe('getEffectiveOrgPlanName', () => {
  beforeEach(() => {
    mocks.getActiveOrganizationPlan.mockReset();
  });

  it('gives a self-hosted organization Enterprise even without a plan row', async () => {
    mocks.env.PUBLIC_IS_SELFHOSTED = 'true';
    mocks.getActiveOrganizationPlan.mockResolvedValue(null);

    expect(await getEffectiveOrgPlanName('org-1')).toBe('ENTERPRISE');
    expect(mocks.getActiveOrganizationPlan).not.toHaveBeenCalled();
  });

  it('reads the active plan row on the hosted product', async () => {
    mocks.env.PUBLIC_IS_SELFHOSTED = 'false';
    mocks.getActiveOrganizationPlan.mockResolvedValueOnce({ planName: 'EARLY_ADOPTER' });

    expect(await getEffectiveOrgPlanName('org-1')).toBe('EARLY_ADOPTER');

    mocks.getActiveOrganizationPlan.mockResolvedValueOnce(null);

    expect(await getEffectiveOrgPlanName('org-1')).toBe('BASIC');
  });
});
