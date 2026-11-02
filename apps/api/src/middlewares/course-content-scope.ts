import { Context, Next } from 'hono';

import { assertContentRefsInCourse } from '@api/services/course/access';
import { handleError } from '@api/utils/errors';

function optionalParam(c: Context, name: string): string[] {
  const value = c.req.param(name);
  return value ? [value] : [];
}

/**
 * Rejects with 404 when a `:lessonId`, `:sectionId`, `:exerciseId` or `:feedId` path param does not belong to `:courseId`.
 * Apply after the course access middleware.
 */
export const courseContentScopeMiddleware = async (c: Context, next: Next) => {
  try {
    const courseId = c.req.param('courseId');
    if (!courseId) {
      return c.json({ success: false, error: 'Course ID is required', code: 'COURSE_ID_REQUIRED' }, 400);
    }

    await assertContentRefsInCourse(courseId, {
      lessonIds: optionalParam(c, 'lessonId'),
      sectionIds: optionalParam(c, 'sectionId'),
      exerciseIds: optionalParam(c, 'exerciseId'),
      newsfeedIds: optionalParam(c, 'feedId')
    });
  } catch (error) {
    return handleError(c, error, 'Failed to verify course content');
  }

  return next();
};
