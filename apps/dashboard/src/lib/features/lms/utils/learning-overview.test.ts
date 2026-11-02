import { describe, expect, it } from 'vitest';
import type { UserEnrolledCourses } from '$features/course/types';
import { CourseSortBy } from '$features/course/utils/constants';
import { filterLearningCourses, getLearningSummary, prioritizeLearningCourses } from './learning-overview';

type Course = UserEnrolledCourses[number];
type Enrollment = NonNullable<Course['enrollment']>;

function enrollment(overrides: Partial<Enrollment>): Enrollment {
  return {
    courseId: 'course',
    enrollmentId: 'enrollment',
    kind: 'ASSIGNED',
    status: 'ACTIVE',
    state: 'not_started',
    dueDate: null,
    batchLabel: null,
    validUntil: null,
    message: '',
    ...overrides
  } as Enrollment;
}

function course(overrides: Partial<Course>): Course {
  return {
    id: 'course',
    title: 'Khóa học',
    lessonCount: 10,
    exerciseCount: 0,
    progressRate: 0,
    exercisesCompleted: 0,
    createdAt: '2026-10-01T00:00:00Z',
    enrollment: enrollment({ kind: 'SELF' }),
    ...overrides
  } as Course;
}

describe('employee learning priorities', () => {
  it('puts dated assigned learning before self-selected courses, even when those have more progress', () => {
    const optional = course({ id: 'optional', progressRate: 9 });
    const required = course({ id: 'required', enrollment: enrollment({ dueDate: '2026-10-26T00:00:00Z' }) });
    expect(prioritizeLearningCourses([optional, required]).map((entry) => entry.id)).toEqual(['required', 'optional']);
  });

  it('orders assigned courses by due date and ignores invalid dates', () => {
    const later = course({ id: 'later', enrollment: enrollment({ dueDate: '2026-10-28T00:00:00Z' }) });
    const earlier = course({ id: 'earlier', enrollment: enrollment({ dueDate: '2026-10-20T00:00:00Z' }) });
    const invalid = course({ id: 'invalid', enrollment: enrollment({ dueDate: 'invalid' }) });
    expect(prioritizeLearningCourses([invalid, later, earlier]).map((entry) => entry.id)).toEqual([
      'earlier',
      'later',
      'invalid'
    ]);
  });

  it('counts waived and completed enrollments as done and keeps expired ones pending', () => {
    const courses = [
      course({ id: 'waived', enrollment: enrollment({ state: 'waived', dueDate: '2026-10-01T00:00:00Z' }) }),
      course({ id: 'completed', enrollment: enrollment({ state: 'completed', dueDate: '2026-10-01T00:00:00Z' }) }),
      course({
        id: 'expired',
        progressRate: 10,
        enrollment: enrollment({ state: 'expired', dueDate: '2026-10-20T00:00:00Z' })
      }),
      course({ id: 'assessment', progressRate: 10, exerciseCount: 1 })
    ];
    const summary = getLearningSummary(courses, Date.parse('2026-10-25T00:00:00Z'));

    expect(summary.completed.map((entry) => entry.id)).toEqual(['waived', 'completed']);
    expect(summary.overdue.map((entry) => entry.id)).toEqual(['expired']);
    expect(summary.pending.map((entry) => entry.id)).toContain('assessment');
  });

  it('treats only assigned enrollments as mandatory', () => {
    const courses = [
      course({ id: 'self', progressRate: 8 }),
      course({ id: 'assigned', enrollment: enrollment({ dueDate: '2026-10-20T00:00:00Z' }) })
    ];
    const summary = getLearningSummary(courses, Date.parse('2026-10-25T00:00:00Z'));

    expect(summary.mandatory.map((entry) => entry.id)).toEqual(['assigned']);
    expect(summary.overdue.map((entry) => entry.id)).toEqual(['assigned']);
  });

  it('searches Vietnamese titles without diacritics and keeps priority order on request', () => {
    const courses = [course({ id: 'b', title: 'An toàn thông tin' }), course({ id: 'a', title: 'Đào tạo hội nhập' })];
    expect(filterLearningCourses(courses, 'dao tao', CourseSortBy.DateCreated).map((entry) => entry.id)).toEqual(['a']);
    expect(filterLearningCourses(courses, '', CourseSortBy.DateCreated, true).map((entry) => entry.id)).toEqual([
      'b',
      'a'
    ]);
  });
});
