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
    '/unsplash',
    '/dash/track',
    '/sso/discover',
    '/organization/sso',
    '/organization/token-auth',
    '/organization/widgets',
    '/agent/credits/purchase',
    '/account/invites',
    '/invite/test',
    '/license',
    '/api/auth/token-exchange',
    '/api/auth/sign-in/anonymous',
    '/api/auth/admin/impersonate-user',
    '/api/auth/sso/register',
    '/api/auth/oauth-proxy-callback',
    '/some-route-added-upstream'
  ])('serves nothing at %s, which MP Learning has not reviewed', async (pathname) => {
    const response = await app.request(pathname, { method: 'POST' });
    expect(response.status).toBe(404);
  });

  it.each([
    '/api/auth/get-session',
    '/api/auth/sign-in/email',
    '/api/auth/login-link',
    '/api/auth/reset-password/token123',
    '/session',
    '/employees/access',
    '/certificate/verify/ABCDEFGH23',
    '/community',
    '/agent/chat',
    '/public-api/v1/courses',
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
