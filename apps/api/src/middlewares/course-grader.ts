import { Context, Next } from 'hono';
import type { TOrganizationApiKeyScope } from '@cio/utils/validation/organization';

import { ErrorCodes } from '@api/utils/errors';
import { canAccessCourseSubmissions, isUserCourseMemberOrOrgAdmin } from '@cio/db/queries/group';
import { courseMemberOrAutomationKeyMiddleware } from './course-member-or-automation-key';

/**
 * Course group admin/tutor or org admin. Requires authMiddleware first.
 */
export const courseGraderMiddleware = async (c: Context, next: Next) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        },
        401
      );
    }

    const courseId = c.req.param('courseId');
    if (!courseId) {
      return c.json(
        {
          success: false,
          error: 'Course ID is required',
          code: 'COURSE_ID_REQUIRED'
        },
        400
      );
    }

    const isAllowed = await canAccessCourseSubmissions(courseId, user.id);
    if (isAllowed) {
      return next();
    }

    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        code: ErrorCodes.UNAUTHORIZED
      },
      403
    );
  } catch (error) {
    console.error('Error in courseGraderMiddleware:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to verify grading access',
        code: 'COURSE_GRADER_CHECK_FAILED'
      },
      500
    );
  }
};

/**
 * Course members or submission graders.
 */
export const courseMemberOrGraderMiddleware = async (c: Context, next: Next) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        },
        401
      );
    }

    const courseId = c.req.param('courseId') || c.req.query('courseId');
    if (!courseId) {
      return c.json(
        {
          success: false,
          error: 'Course ID is required',
          code: 'COURSE_ID_REQUIRED'
        },
        400
      );
    }

    const isMember = await isUserCourseMemberOrOrgAdmin(courseId, user.id);
    if (isMember) {
      return next();
    }

    const canGrade = await canAccessCourseSubmissions(courseId, user.id);
    if (canGrade) {
      return next();
    }

    return c.json(
      {
        success: false,
        error: 'You must be a member of this course to perform this action',
        code: ErrorCodes.ORG_TEAM_NOT_AUTHORIZED
      },
      403
    );
  } catch (error) {
    console.error('Error in courseMemberOrGraderMiddleware:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to verify course membership',
        code: 'COURSE_MEMBER_CHECK_FAILED'
      },
      500
    );
  }
};

/**
 * Course members, submission graders, or an automation key with the given scopes.
 */
export const courseMemberGraderOrAutomationKeyMiddleware =
  (requiredScopes: readonly TOrganizationApiKeyScope[]) => async (c: Context, next: Next) => {
    if (c.get('automationKey')) {
      return courseMemberOrAutomationKeyMiddleware(requiredScopes)(c, next);
    }

    return courseMemberOrGraderMiddleware(c, next);
  };
