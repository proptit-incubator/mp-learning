import { Context, Next } from 'hono';
import { getGroupMemberIdByCourseAndProfile, isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import { getLessonCommentOwnership } from '@cio/db/queries/lesson';

import { ErrorCodes } from '@api/utils/errors';

/**
 * Allows the comment author or a course team member to change a lesson comment of `:courseId`.
 * Requires authMiddleware and a numeric `:commentId` param.
 */
export const lessonCommentAuthorOrTeamMiddleware = async (c: Context, next: Next) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    const courseId = c.req.param('courseId');
    const commentId = Number(c.req.param('commentId'));
    const ownership = Number.isSafeInteger(commentId) ? await getLessonCommentOwnership(commentId) : null;
    if (!courseId || !ownership || ownership.courseId !== courseId) {
      return c.json({ success: false, error: 'Comment not found', code: ErrorCodes.COMMENT_NOT_FOUND }, 404);
    }

    const userGroupMemberId = await getGroupMemberIdByCourseAndProfile(courseId, user.id);
    const isAuthor = Boolean(userGroupMemberId && ownership.authorGroupMemberId === userGroupMemberId);
    if (isAuthor || (await isCourseTeamMemberOrOrgAdmin(courseId, user.id))) {
      return next();
    }

    return c.json(
      {
        success: false,
        error: 'Only the author or course team members can perform this action',
        code: ErrorCodes.ORG_TEAM_NOT_AUTHORIZED
      },
      403
    );
  } catch (error) {
    console.error('Error in lessonCommentAuthorOrTeamMiddleware:', error);
    return c.json(
      { success: false, error: 'Failed to verify comment authorization', code: 'COMMENT_AUTH_CHECK_FAILED' },
      500
    );
  }
};
