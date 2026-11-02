import { describe, expect, it } from 'vitest';

import { getCompletionRulesSummary } from './completion-rules-utils';
import type { Course } from './types';

type CourseOverrides = {
  metadata?: Record<string, unknown> | null;
};

function buildCourse(overrides: CourseOverrides = {}): Course {
  return {
    metadata: null,
    ...overrides
  } as unknown as Course;
}

describe('getCompletionRulesSummary', () => {
  it('defaults to free progression when nothing is stored', () => {
    expect(getCompletionRulesSummary(buildCourse())).toEqual({
      progressionMode: 'free'
    });
  });

  it('summarizes stored rules', () => {
    const course = buildCourse({
      metadata: { progressionMode: 'sequential' }
    });

    expect(getCompletionRulesSummary(course)).toEqual({
      progressionMode: 'sequential'
    });
  });

  it('handles a missing course', () => {
    expect(getCompletionRulesSummary(null)).toEqual({
      progressionMode: 'free'
    });
  });
});
