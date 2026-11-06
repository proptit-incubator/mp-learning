import { describe, expect, it } from 'vitest';
import { legacyOrgPathRedirect, orgSectionRoute } from './org-routes';

describe('orgSectionRoute', () => {
  it('serves short admin paths from the org routes', () => {
    expect(orgSectionRoute('/dash')).toBe('/org/_/dash');
    expect(orgSectionRoute('/settings/ai')).toBe('/org/_/settings/ai');
    expect(orgSectionRoute('/courses')).toBe('/org/_/courses');
    expect(orgSectionRoute('/courses/templates')).toBe('/org/_/courses/templates');
    expect(orgSectionRoute('/studio')).toBe('/org/_');
    expect(orgSectionRoute('/practice')).toBe('/org/_/practice');
    expect(orgSectionRoute('/practice/calls/abc')).toBe('/org/_/practice/calls/abc');
  });

  it('leaves course pages, learner pages and the API proxy alone', () => {
    expect(orgSectionRoute('/courses/5e5007b9-58d3-4b21-aef3-e94af86fdbc0/lessons')).toBeUndefined();
    expect(orgSectionRoute('/lms/mylearning')).toBeUndefined();
    expect(orgSectionRoute('/lms/practice')).toBeUndefined();
    expect(orgSectionRoute('/api/auth/sign-in/email')).toBeUndefined();
    expect(orgSectionRoute('/login')).toBeUndefined();
  });
});

describe('legacyOrgPathRedirect', () => {
  it('sends old organization links to the short paths', () => {
    expect(legacyOrgPathRedirect('/org/mp-transformation/courses')).toBe('/courses');
    expect(legacyOrgPathRedirect('/org/mp-transformation/settings/ai/')).toBe('/settings/ai');
    expect(legacyOrgPathRedirect('/org/mp-transformation')).toBe('/studio');
    expect(legacyOrgPathRedirect('/org/*')).toBe('/studio');
    expect(legacyOrgPathRedirect('/courses')).toBeUndefined();
  });
});
