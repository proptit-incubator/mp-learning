import {
  ZAddCourseMembers,
  ZAvailableCourseEmployees,
  ZCourseEnrollmentOptions,
  ZCourseMembersMemberParam,
  ZCourseMembersParam,
  ZCourseMembersQuery,
  ZResetCourseMemberProgressParam,
  ZUpdateCourseMember
} from '@cio/utils/validation/course/people';
import {
  deleteMember,
  listPaginatedCourseMembers,
  resetMemberCourseProgress,
  updateMember
} from '@api/services/course/people';

import { Hono } from '@api/utils/hono';
import { ZCourseUserAnalyticsParam, ZCourseUserAnalyticsQuery } from '@cio/utils/validation/course';
import { authMiddleware } from '@api/middlewares/auth';
import { courseTeamMemberMiddleware } from '@api/middlewares/course-team-member';
import { getUserCourseAnalytics } from '@cio/core/services/course/course';
import { handleError } from '@api/utils/errors';
import { zValidator } from '@hono/zod-validator';
import { enrollExistingCourseEmployees, listAvailableCourseEmployees } from '@api/services/course/employees';
import {
  ZAssignCourseLearners,
  ZCourseEnrollmentParam,
  ZUpdateEnrollmentDueDate,
  ZWaiveEnrollment
} from '@cio/utils/validation/course/enrollment';
import {
  assignCourseLearners,
  changeEnrollmentDueDate,
  listCourseEnrollments,
  revokeEnrollment,
  waiveEnrollment
} from '@api/services/course/enrollment';

export const membersRouter = new Hono()
  .get('/enrollments', authMiddleware, zValidator('param', ZCourseMembersParam), async (c) => {
    try {
      const data = await listCourseEnrollments(c.req.valid('param').courseId, c.get('user')!.id);
      return c.json({ success: true, data });
    } catch (error) {
      return handleError(c, error, 'Failed to list enrollments');
    }
  })
  .post(
    '/enrollments',
    authMiddleware,
    zValidator('param', ZCourseMembersParam),
    zValidator('json', ZAssignCourseLearners),
    async (c) => {
      try {
        const data = await assignCourseLearners(c.req.valid('param').courseId, c.get('user')!.id, c.req.valid('json'));
        return c.json({ success: true, data });
      } catch (error) {
        return handleError(c, error, 'Failed to assign course');
      }
    }
  )
  .patch(
    '/enrollments/:enrollmentId',
    authMiddleware,
    zValidator('param', ZCourseEnrollmentParam),
    zValidator('json', ZUpdateEnrollmentDueDate),
    async (c) => {
      try {
        const { courseId, enrollmentId } = c.req.valid('param');
        const data = await changeEnrollmentDueDate(
          courseId,
          enrollmentId,
          c.get('user')!.id,
          c.req.valid('json').dueDate
        );
        return c.json({ success: true, data });
      } catch (error) {
        return handleError(c, error, 'Failed to update due date');
      }
    }
  )
  .post(
    '/enrollments/:enrollmentId/waive',
    authMiddleware,
    zValidator('param', ZCourseEnrollmentParam),
    zValidator('json', ZWaiveEnrollment),
    async (c) => {
      try {
        const { courseId, enrollmentId } = c.req.valid('param');
        const data = await waiveEnrollment(courseId, enrollmentId, c.get('user')!.id, c.req.valid('json'));
        return c.json({ success: true, data });
      } catch (error) {
        return handleError(c, error, 'Failed to waive enrollment');
      }
    }
  )
  .delete('/enrollments/:enrollmentId', authMiddleware, zValidator('param', ZCourseEnrollmentParam), async (c) => {
    try {
      const { courseId, enrollmentId } = c.req.valid('param');
      const data = await revokeEnrollment(courseId, enrollmentId, c.get('user')!.id);
      return c.json({ success: true, data });
    } catch (error) {
      return handleError(c, error, 'Failed to revoke enrollment');
    }
  })
  .get(
    '/available',
    courseTeamMemberMiddleware,
    zValidator('param', ZCourseMembersParam),
    zValidator('query', ZAvailableCourseEmployees),
    async (c) => {
      try {
        const { courseId } = c.req.valid('param');
        const { search } = c.req.valid('query');
        const employees = await listAvailableCourseEmployees(courseId, search);
        return c.json({ success: true, data: employees });
      } catch (error) {
        return handleError(c, error, 'Failed to list available employees');
      }
    }
  )
  /**
   * GET /course/:courseId/members
   * Gets one page of course members for a course, filtered by search term and role
   * Requires authentication and course team membership (admin/tutor role)
   */
  .get(
    '/',
    courseTeamMemberMiddleware,
    zValidator('param', ZCourseMembersParam),
    zValidator('query', ZCourseMembersQuery),
    async (c) => {
      try {
        const { courseId } = c.req.valid('param');
        const query = c.req.valid('query');
        const result = await listPaginatedCourseMembers(courseId, query);
        const pagination = {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        };

        return c.json(
          {
            success: true,
            data: result.items,
            pagination
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to fetch course members');
      }
    }
  )
  /**
   * POST /course/:courseId/members
   * Adds one or more course members to a course
   * Accepts either a single member (ZAddCourseMember) or multiple members (ZAddCourseMembers)
   * Requires authentication and course team membership (admin/tutor role)
   */
  .post(
    '/',
    courseTeamMemberMiddleware,
    zValidator('param', ZCourseMembersParam),
    zValidator('json', ZAddCourseMembers),
    zValidator('query', ZCourseEnrollmentOptions),
    async (c) => {
      try {
        const { courseId } = c.req.valid('param');
        const members = c.req.valid('json');

        const { sendEmail } = c.req.valid('query');
        const addedMembers = await enrollExistingCourseEmployees(courseId, c.get('user')!.id, members, sendEmail);

        return c.json(
          {
            success: true,
            data: addedMembers
          },
          201
        );
      } catch (error) {
        return handleError(c, error, 'Failed to add course member(s)');
      }
    }
  )
  /**
   * PUT /course/:courseId/members/:memberId
   * Updates a course member
   * Requires authentication and course team membership (admin/tutor role)
   */
  .put(
    '/:memberId',
    courseTeamMemberMiddleware,
    zValidator('param', ZCourseMembersMemberParam),
    zValidator('json', ZUpdateCourseMember),
    async (c) => {
      try {
        const { courseId, memberId } = c.req.valid('param');
        const validatedData = c.req.valid('json');

        const member = await updateMember(courseId, memberId, validatedData);

        return c.json(
          {
            success: true,
            data: member
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to update course member');
      }
    }
  )
  /**
   * DELETE /course/:courseId/members/:memberId
   * Deletes a course member
   * Requires authentication and course team membership (admin/tutor role)
   */
  .delete('/:memberId', courseTeamMemberMiddleware, zValidator('param', ZCourseMembersMemberParam), async (c) => {
    try {
      const { courseId, memberId } = c.req.valid('param');
      const member = await deleteMember(courseId, memberId, { actorProfileId: c.get('user')?.id ?? null });

      return c.json(
        {
          success: true,
          data: member
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to delete course member');
    }
  })
  /**
   * POST /course/:courseId/members/:memberId/reset-progress
   * Clears all learner progress for a course member while keeping them enrolled.
   * Requires authentication and course team membership (admin/tutor role)
   */
  .post(
    '/:memberId/reset-progress',
    courseTeamMemberMiddleware,
    zValidator('param', ZResetCourseMemberProgressParam),
    async (c) => {
      try {
        const user = c.get('user')!;
        const { courseId, memberId } = c.req.valid('param');
        const summary = await resetMemberCourseProgress(courseId, memberId, user.id);

        return c.json(
          {
            success: true,
            data: summary
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to reset course member progress');
      }
    }
  )
  /**
   * GET /course/:courseId/members/:userId/analytics
   * Gets user course analytics for a specific course
   * Requires authentication and course membership
   */
  .get(
    '/:userId/analytics',
    courseTeamMemberMiddleware,
    zValidator('param', ZCourseUserAnalyticsParam),
    zValidator('query', ZCourseUserAnalyticsQuery),
    async (c) => {
      try {
        const { courseId, userId } = c.req.valid('param');
        const { includeProgressImpact } = c.req.valid('query');
        const analytics = await getUserCourseAnalytics(courseId, userId, { includeProgressImpact });

        return c.json(
          {
            success: true,
            data: analytics
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to fetch user course analytics');
      }
    }
  );
