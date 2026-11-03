import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context, Next } from 'hono';

vi.mock('@api/middlewares/auth', () => ({
  authMiddleware: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1' });
    c.set('orgRoles', { 'org-own': 1 });
    await next();
  }
}));

vi.mock('@api/services/dash', () => ({
  getCurrentUserLoginStreak: vi.fn(),
  getOrganisationAnalytics: vi.fn().mockResolvedValue({}),
  getStudentLoginActivity: vi.fn().mockResolvedValue([])
}));

vi.mock('@api/services/learning-analytics', () => ({
  resolveLearningAnalyticsScope: vi.fn().mockResolvedValue({ kind: 'organization' })
}));

vi.mock('@api/services/analytics', () => ({
  getCountryBreakdown: vi.fn().mockResolvedValue([]),
  getCourseFunnel: vi.fn().mockResolvedValue({ steps: [] }),
  getLandingStats: vi.fn().mockResolvedValue({}),
  getTopCoursesByViews: vi.fn().mockResolvedValue([]),
  ingestEventBatch: vi.fn()
}));

import { getOrganisationAnalytics, getStudentLoginActivity } from '@api/services/dash';
import { resolveLearningAnalyticsScope } from '@api/services/learning-analytics';
import { getCountryBreakdown, getCourseFunnel, getLandingStats } from '@api/services/analytics';
import { dashAnalyticsRouter } from '@api/routes/dash';

const OWN_ORG = 'org-own';
const OTHER_ORG = '99999999-9999-4999-8999-999999999999';

const get = (path: string) => dashAnalyticsRouter.request(path, { headers: { 'cio-org-id': OWN_ORG } });

describe('dash analytics routes read the org verified by the middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ignores a query orgId or siteName that differs from the verified header org', async () => {
    await get(`/stats?orgId=${OTHER_ORG}`);
    await get('/stats?siteName=someone-else');

    expect(resolveLearningAnalyticsScope).toHaveBeenCalledWith(OWN_ORG, 'user-1');
    expect(getOrganisationAnalytics).toHaveBeenNthCalledWith(1, OWN_ORG, { kind: 'organization' }, false);
    expect(getOrganisationAnalytics).toHaveBeenNthCalledWith(2, OWN_ORG, { kind: 'organization' }, false);
  });

  it.each([
    ['/landing-stats', getLandingStats],
    ['/country-breakdown', getCountryBreakdown]
  ])('%s uses the verified org', async (path, service) => {
    const response = await get(`${path}?orgId=${OTHER_ORG}`);

    expect(response.status).toBe(200);
    expect(service).toHaveBeenCalledWith(OWN_ORG, 30, false);
  });

  it('/course-funnel uses the verified org', async () => {
    await get(`/course-funnel?orgId=${OTHER_ORG}`);

    expect(getCourseFunnel).toHaveBeenCalledWith(OWN_ORG, 30, undefined, false);
  });

  it('/login-activity uses the verified org', async () => {
    await get(`/login-activity?orgId=${OTHER_ORG}`);

    expect(getStudentLoginActivity).toHaveBeenCalledWith(OWN_ORG, 90);
  });

  it('still rejects a header org the user does not belong to', async () => {
    const response = await dashAnalyticsRouter.request(`/landing-stats?orgId=${OTHER_ORG}`, {
      headers: { 'cio-org-id': OTHER_ORG }
    });

    expect(response.status).toBe(403);
    expect(getLandingStats).not.toHaveBeenCalled();
  });
});
