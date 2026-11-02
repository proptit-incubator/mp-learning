import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from '@api/utils/hono';
import { learningAnalyticsRouter } from '@api/routes/dash/learning-analytics';
import { getLearningAnalytics } from '@api/services/learning-analytics';
import { AppError, ErrorCodes } from '@api/utils/errors';

vi.mock('@api/services/learning-analytics', () => ({ getLearningAnalytics: vi.fn() }));

const organizationId = '00000000-0000-4000-8000-000000000001';

function makeApp(signedIn: boolean) {
  return new Hono()
    .use('*', async (context, next) => {
      context.set('user', signedIn ? ({ id: 'test-user' } as never) : null);
      context.set('session', signedIn ? ({ id: 'test-session' } as never) : null);
      await next();
    })
    .route('/', learningAnalyticsRouter);
}

describe('internal training analytics route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the report for the signed-in actor and never caches it', async () => {
    vi.mocked(getLearningAnalytics).mockResolvedValue({ days: 7 } as never);
    const response = await makeApp(true).request('/learning-analytics?days=7', {
      headers: { 'cio-org-id': organizationId }
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(getLearningAnalytics).toHaveBeenCalledWith(organizationId, 'test-user', 7);
  });

  it('passes through the service refusal for actors without a reporting scope', async () => {
    vi.mocked(getLearningAnalytics).mockRejectedValue(new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403));
    const response = await makeApp(true).request('/learning-analytics', { headers: { 'cio-org-id': organizationId } });
    expect(response.status).toBe(403);
  });

  it('rejects anonymous callers, a missing organization and unsupported date windows', async () => {
    const anonymous = await makeApp(false).request('/learning-analytics', {
      headers: { 'cio-org-id': organizationId }
    });
    expect(anonymous.status).toBe(401);
    const missingOrg = await makeApp(true).request('/learning-analytics');
    expect(missingOrg.status).toBe(400);
    const invalid = await makeApp(true).request('/learning-analytics?days=8', {
      headers: { 'cio-org-id': organizationId }
    });
    expect(invalid.status).toBe(400);
    expect(getLearningAnalytics).not.toHaveBeenCalled();
  });
});
