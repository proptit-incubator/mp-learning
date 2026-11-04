import { describe, expect, it } from 'vitest';
import { afterSignInPath, homePathFor } from './home-path';

describe('homePathFor', () => {
  it('sends administrators and L&D to the dashboard and employees to their learning', () => {
    expect(homePathFor({ 'org-1': 1 })).toBe('/dash');
    expect(homePathFor({ 'org-1': 2 })).toBe('/dash');
    expect(homePathFor({ 'org-1': 3 })).toBe('/lms');
    expect(homePathFor(undefined)).toBe('/lms');
  });
});

describe('afterSignInPath', () => {
  it('keeps a safe requested page and falls back to the home page', () => {
    expect(afterSignInPath('/courses/abc/lessons', { 'org-1': 3 })).toBe('/courses/abc/lessons');
    expect(afterSignInPath(null, { 'org-1': 1 })).toBe('/dash');
    expect(afterSignInPath('//evil.example', { 'org-1': 3 })).toBe('/lms');
    expect(afterSignInPath('/login', { 'org-1': 3 })).toBe('/lms');
  });
});
