import { describe, expect, it } from 'vitest';
import type { LearningReportCourse } from './types';
import {
  departmentCompletionRate,
  filterLearningReportCourses,
  getLearningActivityScale
} from './learning-analytics-utils';

const courses = [
  { id: '1', title: 'Đào tạo Hội nhập', assigned: 2, overdue: 1 },
  { id: '2', title: 'An toàn thông tin', assigned: 0, overdue: 0 }
] as LearningReportCourse[];

describe('training report filters', () => {
  it('matches Vietnamese without accents and composes search with assignment/overdue filters', () => {
    expect(filterLearningReportCourses(courses, 'dao tao', 'all').map((course) => course.id)).toEqual(['1']);
    expect(filterLearningReportCourses(courses, '', 'assigned')).toHaveLength(1);
    expect(filterLearningReportCourses(courses, 'an toan', 'overdue')).toHaveLength(0);
    expect(courses).toHaveLength(2);
  });

  it('keeps a valid chart scale for empty activity and uses the larger series', () => {
    expect(getLearningActivityScale([])).toBe(1);
    expect(getLearningActivityScale([{ date: '2026-10-25', lessons: 2, submissions: 8 }])).toBe(8);
  });
});

describe('departmentCompletionRate', () => {
  it('rounds the completed share and leaves departments without assignments blank', () => {
    expect(departmentCompletionRate({ assigned: 3, completed: 2 })).toBe(67);
    expect(departmentCompletionRate({ assigned: 0, completed: 0 })).toBeNull();
  });
});
