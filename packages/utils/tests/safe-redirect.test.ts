import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '../src/functions/links';

describe('safeRedirectPath', () => {
  it.each([
    ['/courses/1/lessons?next=true', '/courses/1/lessons?next=true'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['/a\\b', '/'],
    ['https://evil.example', '/'],
    [undefined, '/']
  ])('keeps %s as %s', (redirect, expected) => {
    expect(safeRedirectPath(redirect)).toBe(expected);
  });
});
