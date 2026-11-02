import type { UserEnrolledCourses } from '$features/course/types';
import {
  getStudentCourseDueDate,
  getStudentCourseProgressPercent,
  isStudentCourseAssigned,
  isStudentCourseComplete
} from '$features/course/utils/student-course-progress';
import { CourseSortBy } from '$features/course/utils/constants';

type LearningCourse = UserEnrolledCourses[number];

export function normalizeLearningSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .trim();
}

export function getLearningDeadline(course: LearningCourse): number {
  if (isStudentCourseComplete(course)) return Number.POSITIVE_INFINITY;

  const dueDate = getStudentCourseDueDate(course);
  const deadline = dueDate ? new Date(dueDate).getTime() : Number.NaN;
  return Number.isFinite(deadline) ? deadline : Number.POSITIVE_INFINITY;
}

export function prioritizeLearningCourses(courses: UserEnrolledCourses): UserEnrolledCourses {
  return [...courses].sort((leftCourse, rightCourse) => {
    const leftDeadline = getLearningDeadline(leftCourse);
    const rightDeadline = getLearningDeadline(rightCourse);
    if (leftDeadline !== rightDeadline) return leftDeadline < rightDeadline ? -1 : 1;

    return getStudentCourseProgressPercent(rightCourse) - getStudentCourseProgressPercent(leftCourse);
  });
}

export function filterLearningCourses(
  courses: UserEnrolledCourses,
  search: string,
  sort: CourseSortBy,
  keepOrder = false
): UserEnrolledCourses {
  const normalizedSearch = normalizeLearningSearch(search);
  const matchingCourses = courses.filter((course) => normalizeLearningSearch(course.title).includes(normalizedSearch));
  if (keepOrder) return matchingCourses;

  return matchingCourses.sort((leftCourse, rightCourse) => {
    if (sort === CourseSortBy.Lessons) return (rightCourse.lessonCount ?? 0) - (leftCourse.lessonCount ?? 0);

    if (sort === CourseSortBy.Published) return Number(rightCourse.isPublished) - Number(leftCourse.isPublished);

    const leftDate = sort === CourseSortBy.LastUpdatedAt ? leftCourse.updatedAt : leftCourse.createdAt;
    const rightDate = sort === CourseSortBy.LastUpdatedAt ? rightCourse.updatedAt : rightCourse.createdAt;
    const leftTimestamp = new Date(leftDate ?? leftCourse.createdAt ?? 0).getTime() || 0;
    const rightTimestamp = new Date(rightDate ?? rightCourse.createdAt ?? 0).getTime() || 0;
    return rightTimestamp - leftTimestamp;
  });
}

export function getLearningSummary(courses: UserEnrolledCourses, now: number) {
  const completed = courses.filter(isStudentCourseComplete);
  const pending = prioritizeLearningCourses(courses.filter((course) => !isStudentCourseComplete(course)));
  const mandatory = pending.filter(isStudentCourseAssigned);
  const overdue = mandatory.filter((course) => getLearningDeadline(course) < now);
  const completedItems = courses.reduce(
    (total, course) => total + (course.progressRate ?? 0) + (course.exercisesCompleted ?? 0),
    0
  );
  const totalItems = courses.reduce(
    (total, course) => total + (course.lessonCount ?? 0) + (course.exerciseCount ?? 0),
    0
  );
  const progress = totalItems > 0 ? Math.min(100, Math.round((completedItems / totalItems) * 100)) : 0;

  return { completed, pending, mandatory, overdue, completedItems, totalItems, progress };
}
