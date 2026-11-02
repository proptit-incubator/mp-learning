import type { CourseProgressionMode } from '@cio/utils/functions/course-progression';

import type { Course } from './types';

type CompletionRulesCourse = Pick<Course, 'metadata'>;

export type CompletionRulesSummary = {
  progressionMode: CourseProgressionMode;
};

/** The completion rules as the API applies them, for read-only display outside the course Settings tab. */
export function getCompletionRulesSummary(course: CompletionRulesCourse | null): CompletionRulesSummary {
  return {
    progressionMode: course?.metadata?.progressionMode === 'sequential' ? 'sequential' : 'free'
  };
}
