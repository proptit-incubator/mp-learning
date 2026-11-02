import { AppError, ErrorCodes } from '@api/utils/errors';
import { assertContentRefsInCourse } from '@api/services/course/access';
import { getAttendanceByCourseId, getAttendanceByStudentAndLesson, upsertAttendance } from '@cio/db/queries/attendance';
import type { TGroupAttendance, TNewGroupAttendance } from '@cio/db/types';
import type { TAttendanceUpsert } from '@cio/utils/validation/attendance';

/**
 * Lists attendance records for a course
 * @param courseId Course ID
 * @param lessonId Optional lesson ID filter
 * @returns Array of attendance records
 */
export async function listAttendance(courseId: string, lessonId?: string): Promise<TGroupAttendance[]> {
  try {
    return await getAttendanceByCourseId(courseId, lessonId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to list attendance',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Creates or updates an attendance record of `courseId`. The body's courseId is ignored.
 * Throws 404 when the lesson or student does not belong to the course.
 */
export async function upsertAttendanceService(courseId: string, data: TAttendanceUpsert): Promise<TGroupAttendance> {
  await assertContentRefsInCourse(courseId, { lessonIds: [data.lessonId], groupMemberIds: [data.studentId] });

  try {
    const attendanceData: TNewGroupAttendance = {
      courseId,
      lessonId: data.lessonId,
      studentId: data.studentId,
      isPresent: data.isPresent
    };

    return await upsertAttendance(attendanceData);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to upsert attendance',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}
