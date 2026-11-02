import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { internalLearning } from './internal-learning';

describe('internal learning surfaces', () => {
  const app = new Hono().use('*', internalLearning).all('*', (context) => context.text('ok'));

  it.each([
    '/course/slug/example',
    '/course/123/payment-request',
    '/widgets/demo',
    '/org-site/course/demo',
    '/org-site/og/mp',
    '/organization/courses/public',
    '/organization/tags/public',
    '/onboarding/create-org',
    '/onboarding/update-metadata',
    '/account/workspaces',
    '/account/workspaces/legacy-id',
    '/account/usage',
    '/organization/join',
    '/organization/plan/activate',
    '/organization/plan/early-adopter-event',
    '/domain/request',
    '/v1/organization/landing-page/featured-courses',
    '/public-api/v1/organization/landing-page/featured-courses'
  ])('retires %s', async (pathname) => {
    const response = await app.request(pathname);
    expect(response.status).toBe(404);
  });

  it.each(['POST', 'DELETE'])('blocks %s organization creation and deletion', async (method) => {
    const response = await app.request('/organization', { method });
    expect(response.status).toBe(404);
  });

  it('preserves operational settings updates', async () => {
    const updateApp = new Hono().use('*', internalLearning).put('/organization', (context) => context.text('ok'));
    const response = await updateApp.request('/organization', { method: 'PUT' });
    expect(response.status).toBe(200);
  });

  it.each([
    ['POST', '/organization/team/invite'],
    ['GET', '/organization/link-invite'],
    ['POST', '/organization/link-invite'],
    ['PATCH', '/organization/team/42'],
    ['DELETE', '/organization/team/42'],
    ['POST', '/invite/organization/token/accept'],
    ['GET', '/invite/link/token/preview'],
    ['POST', '/invite/r/token/accept']
  ])('retires team invitation %s %s because roles are granted from Employees', async (method, pathname) => {
    const response = await app.request(pathname, { method });
    expect(response.status).toBe(404);
  });

  it.each([
    '/api/auth/get-session',
    '/invite/test',
    '/invite/organization/pending',
    '/organization/team',
    '/account',
    '/course/123',
    '/organization/first'
  ])('preserves %s', async (pathname) => {
    const response = await app.request(pathname);
    expect(response.status).toBe(200);
  });
});
