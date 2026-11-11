import { describe, expect, it } from 'vitest';
import { getCourseShareUrl } from './course-share-url';

describe('getCourseShareUrl', () => {
  it('links to the course in MP Learning rather than a public landing page', () => {
    expect(getCourseShareUrl('course-1', 'https://learn.mp.test')).toBe(
      'https://learn.mp.test/courses/course-1/lessons'
    );
  });
});
