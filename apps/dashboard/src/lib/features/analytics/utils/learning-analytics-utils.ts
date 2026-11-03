import type { ExportDocument } from '@cio/utils/export';
import type {
  LearningAssignmentRow,
  LearningCourseFilter,
  LearningDepartment,
  LearningReportCourse,
  LearningReportDay,
  LearningState
} from './types';

export function filterLearningReportCourses(
  courses: LearningReportCourse[],
  search: string,
  filter: LearningCourseFilter
) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLocaleLowerCase('vi')
      .trim();
  const normalizedSearch = normalize(search);
  return courses.filter((course) => {
    if (filter === 'overdue' && course.overdue === 0) return false;

    if (filter === 'assigned' && course.assigned === 0) return false;

    return normalize(course.title).includes(normalizedSearch);
  });
}

export function getLearningActivityScale(days: LearningReportDay[]) {
  return Math.max(1, ...days.map((day) => Math.max(day.lessons, day.submissions)));
}

export function buildLearningExport(
  courses: LearningReportCourse[],
  title: string,
  subtitle: string,
  headers: {
    course: string;
    assigned: string;
    notStarted: string;
    inProgress: string;
    completed: string;
    overdue: string;
    progress: string;
  }
): ExportDocument<LearningReportCourse> {
  return {
    filename: 'mp-learning-training-report',
    title,
    subtitle,
    columns: [
      { key: 'course', header: headers.course, value: (row) => row.title },
      { key: 'assigned', header: headers.assigned, value: (row) => row.assigned },
      { key: 'notStarted', header: headers.notStarted, value: (row) => row.not_started },
      { key: 'inProgress', header: headers.inProgress, value: (row) => row.in_progress },
      { key: 'completed', header: headers.completed, value: (row) => row.completed },
      { key: 'overdue', header: headers.overdue, value: (row) => row.overdue },
      { key: 'progress', header: headers.progress, value: (row) => (row.progress === null ? null : `${row.progress}%`) }
    ],
    rows: courses
  };
}

/** Share of a department's assignments that are completed, or null when nothing is assigned there. */
export function departmentCompletionRate(department: Pick<LearningDepartment, 'assigned' | 'completed'>) {
  return department.assigned > 0 ? Math.round((department.completed / department.assigned) * 100) : null;
}

export function buildAssignmentExport(
  rows: LearningAssignmentRow[],
  title: string,
  headers: Record<
    'employee' | 'code' | 'department' | 'course' | 'batch' | 'due' | 'state' | 'progress' | 'completed' | 'validUntil',
    string
  >,
  stateLabel: (state: LearningState) => string
): ExportDocument<LearningAssignmentRow> {
  const day = (value: string | null) => (value ? value.slice(0, 10) : null);
  return {
    filename: 'mp-learning-assigned-training',
    title,
    subtitle: '',
    columns: [
      { key: 'employee', header: headers.employee, value: (row) => row.fullname },
      { key: 'code', header: headers.code, value: (row) => row.employeeCode },
      { key: 'department', header: headers.department, value: (row) => row.department },
      { key: 'course', header: headers.course, value: (row) => row.courseTitle },
      { key: 'batch', header: headers.batch, value: (row) => row.batchLabel },
      { key: 'due', header: headers.due, value: (row) => day(row.dueDate) },
      { key: 'state', header: headers.state, value: (row) => stateLabel(row.state) },
      { key: 'progress', header: headers.progress, value: (row) => `${row.progress}%` },
      { key: 'completed', header: headers.completed, value: (row) => day(row.completedAt) },
      { key: 'validUntil', header: headers.validUntil, value: (row) => day(row.validUntil) }
    ],
    rows
  };
}
