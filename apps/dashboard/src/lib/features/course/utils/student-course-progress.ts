import type { UserEnrolledCourses } from '$features/course/types';

type StudentEnrolledCourse = UserEnrolledCourses[number];

function getCourseContentProgress(course: StudentEnrolledCourse) {
  const exercisesCompleted = typeof course.exercisesCompleted === 'number' ? course.exercisesCompleted : 0;
  const totalExercises = typeof course.exerciseCount === 'number' ? course.exerciseCount : 0;
  const totalItems = (course.lessonCount ?? 0) + totalExercises;

  if (totalItems <= 0) {
    return 0;
  }

  const completedItems = (course.progressRate ?? 0) + exercisesCompleted;
  return Math.round((completedItems / totalItems) * 100);
}

export function getStudentCourseProgressPercent(course: StudentEnrolledCourse) {
  return getCourseContentProgress(course);
}

/** Uses the enrollment state when there is one, so tabs and status badges always agree. */
export function isStudentCourseComplete(course: StudentEnrolledCourse) {
  const state = course.enrollment?.state;
  if (state) return state === 'completed' || state === 'waived';

  return getCourseContentProgress(course) >= 100;
}

export function isStudentCourseAssigned(course: StudentEnrolledCourse) {
  return course.enrollment?.kind === 'ASSIGNED';
}

export function getStudentCourseDueDate(course: StudentEnrolledCourse) {
  return isStudentCourseAssigned(course) ? (course.enrollment?.dueDate ?? null) : null;
}

export function isStudentCourseOverdue(course: StudentEnrolledCourse, now = Date.now()) {
  const dueDate = getStudentCourseDueDate(course);
  if (!dueDate || isStudentCourseComplete(course)) return false;

  return new Date(dueDate).getTime() < now;
}
