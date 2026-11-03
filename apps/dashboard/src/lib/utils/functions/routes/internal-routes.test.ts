import { describe, expect, it } from 'vitest';
import { isEmployeeContentPage, isRetiredPage } from './internal-routes';

describe('internal LMS routes', () => {
  it.each([
    '/org/mp/landingpage',
    '/org/mp/landingpage/edit',
    '/org/mp/settings/billing',
    '/org/mp/settings/org',
    '/org/mp/settings/workspaces',
    '/org/mp/settings/domains',
    '/org/mp/settings/ai-credits',
    '/org/mp/settings/teams',
    '/org/mp/setup',
    '/api/polar/webhook',
    '/courses/internal-course/landingpage',
    '/claim/old-subscription',
    '/widgets/test',
    '/pages/example'
  ])('retires %s', (pathname) => {
    expect(isRetiredPage(pathname)).toBe(true);
  });

  it.each([
    '/login',
    '/signup',
    '/invite/test',
    '/org/mp/courses',
    '/org/mp/settings/customize-lms',
    '/org/mp/automation/mcp',
    '/org/mp/automation/webhooks'
  ])('preserves %s', (pathname) => {
    expect(isRetiredPage(pathname)).toBe(false);
  });

  it.each(['/course/example/lesson/intro', '/courses', '/lms', '/lms/certificates', '/home'])(
    'requires a session for %s',
    (pathname) => {
      expect(isEmployeeContentPage(pathname)).toBe(true);
    }
  );
});
