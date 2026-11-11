import { ContentType } from '@cio/utils/constants';
import { AppError } from '@api/utils/errors';
import { assertEnrolledStudentContentAccess } from './access';

type CourseWithUpcomingSession = { id: string; upcomingSession: { lessonId: string } | null };

async function canOpenLesson(courseId: string, profileId: string, lessonId: string) {
  try {
    await assertEnrolledStudentContentAccess({ courseId, profileId, contentId: lessonId, type: ContentType.Lesson });

    return true;
  } catch (error) {
    if (error instanceof AppError) return false;
    throw error;
  }
}

/**
 * Drops each course's upcoming live session when the learner cannot open its lesson yet, so a locked lesson or one
 * behind sequential progression never exposes its join link.
 */
export async function hideLockedUpcomingSessions<C extends CourseWithUpcomingSession>(
  courses: C[],
  profileId: string
): Promise<C[]> {
  return Promise.all(
    courses.map(async (course) => {
      if (!course.upcomingSession) return course;

      const canOpen = await canOpenLesson(course.id, profileId, course.upcomingSession.lessonId);

      return canOpen ? course : { ...course, upcomingSession: null };
    })
  );
}
