import { listCourseLibrary, getCourseLibraryDetails } from '@api/services/course/library';
import {
  ZAssignAudienceCourses,
  ZAudienceInviteByEmail,
  ZCourseReorder,
  ZAudienceExportQuery,
  ZBulkAudienceAction,
  ZGetAudienceQuery,
  ZGetOrganizationCoursesQuery,
  ZGetOrganizations,
  ZGetUserAnalytics,
  ZImportAudienceMembers,
  ZLMSExercisesParam,
  ZRemoveTeamMember,
  ZUndoBulkAudienceAction,
  ZUpdateOrganization
} from '@cio/utils/validation/organization';
import { assertMcpAutomationUsageAllowed, recordMcpAutomationUsage } from '@api/services/organization/automation-usage';
import {
  assignAudienceToCourses,
  importAudienceMembers,
  resendAudienceInvite,
  revokeAudiencePendingInvite
} from '@api/services/organization/audience';
import { getAudienceExportRows } from '@api/services/organization/audience-export';
import {
  applyBulkAudienceAction,
  getBulkAudienceActionStatus,
  previewBulkAudienceAction,
  undoBulkAudienceAction
} from '@api/services/organization/audience-bulk';
import {
  getFirstOrgForSelfHosted,
  getOrgAudience,
  getOrgTeam,
  getOrganizationCourses,
  getOrganizationNavCounts,
  getOrganizationsWithFilters,
  getRecommendedCourses,
  getUserAnalytics,
  getUserEnrolledCourses,
  removeAudienceMember,
  reorderOrgCourses,
  updateOrg
} from '@api/services/organization';

import { Hono } from '@api/utils/hono';
import { ROLE } from '@cio/utils/constants';
import { TOrganization } from '@db/types';
import { assetsRouter } from '@api/routes/organization/assets';
import { organizationAiTutorRouter } from '@api/routes/organization/ai-tutor';
import { organizationAiPolicyRouter } from '@api/routes/organization/ai-policy';
import { organizationMemberEmailNotificationsRouter } from '@api/routes/organization/member-email-notifications';
import { authMiddleware } from '@api/middlewares/auth';
import { authOrApiKeyMiddleware } from '@api/middlewares/auth-or-api-key';
import { authOrAutomationKeyMiddleware } from '@api/middlewares/auth-or-automation-key';
import { automationRouter } from '@api/routes/organization/automation';
import { webhooksRouter } from '@api/routes/organization/webhooks';
import { courseImportRouter } from '@api/routes/organization/course-import';
import { getLMSExercisesService } from '@api/services/exercise';
import { handleError } from '@api/utils/errors';
import { orgAdminMiddleware } from '@api/middlewares/org-admin';
import { orgMemberMiddleware } from '@api/middlewares/org-member';
import { orgMemberOrAutomationKeyMiddleware } from '@api/middlewares/org-member-or-automation-key';
import { orgTeamMemberMiddleware } from '@api/middlewares/org-team-member';
import { quizRouter } from '@api/routes/organization/quiz';
import { searchRouter } from '@api/routes/organization/search';
import { tagsRouter } from '@api/routes/organization/tags';
import { zValidator } from '@hono/zod-validator';
import { ZCourseLibraryParam, ZGetRecommendedCourses } from '@cio/utils/validation/course';
import { studentEmailTemplatesRouter } from '@api/routes/organization/email-templates';

export const organizationRouter = new Hono()
  /**
   * GET /organization
   * Gets organizations with optional filters
   * Query params: siteName (string, optional), customDomain (string, optional), isCustomDomainVerified (boolean, optional)
   * Accepts: User session OR API key (for server-side routes)
   */
  .get('/', authOrApiKeyMiddleware, zValidator('query', ZGetOrganizations), async (c) => {
    try {
      const filters = c.req.valid('query');
      const organizations = await getOrganizationsWithFilters(filters);

      return c.json(
        {
          success: true,
          data: organizations
        },
        200
      );
    } catch (error) {
      console.error('Error fetching organizations:', error);
      return handleError(c, error, 'Failed to fetch organizations');
    }
  })
  /**
   * GET /organization/first
   * Gets the first organization (for self-hosted single-org mode). Requires API key.
   */
  .get('/first', authOrApiKeyMiddleware, async (c) => {
    try {
      const org = await getFirstOrgForSelfHosted();
      return c.json(
        {
          success: true,
          data: org ? [org] : []
        },
        200
      );
    } catch (error) {
      console.error('Error fetching first organization:', error);
      return handleError(c, error, 'Failed to fetch first organization');
    }
  })
  /**
   * GET /organization/team
   * Gets organization team members (non-students)
   * Requires organization admin access
   */
  .get('/team', authMiddleware, orgAdminMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const team = await getOrgTeam(orgId);

      return c.json(
        {
          success: true,
          data: team
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to fetch organization team');
    }
  })
  /**
   * GET /organization/audience
   * Gets organization audience (students)
   * Requires organization admin access
   */
  .get('/audience', authMiddleware, orgAdminMiddleware, zValidator('query', ZGetAudienceQuery), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const query = c.req.valid('query');
      const audience = await getOrgAudience(orgId, query);

      return c.json(
        {
          success: true,
          data: audience.items,
          pagination: audience.pagination,
          query: audience.query
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to fetch organization audience');
    }
  })
  /**
   * GET /organization/audience/export
   * Every row matching the scope, for a client-side export. Not paginated —
   * the caller builds the file in the browser, so it needs the whole set.
   * Requires organization admin access.
   */
  .get('/audience/export', authMiddleware, orgAdminMiddleware, zValidator('query', ZAudienceExportQuery), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const query = c.req.valid('query');
      const rows = await getAudienceExportRows(orgId, query);

      return c.json({ success: true, data: rows }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to build audience export');
    }
  })
  /**
   * GET /organization/audience/bulk-preview
   * Exact count, target hash and sample for a filter-mode bulk action.
   * The hash is what the apply step verifies the admin actually reviewed.
   */
  .get(
    '/audience/bulk-preview',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('query', ZGetAudienceQuery.omit({ page: true, limit: true, sortBy: true, sortOrder: true })),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const filter = c.req.valid('query');
        const preview = await previewBulkAudienceAction(orgId, filter);

        return c.json({ success: true, data: preview }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to preview bulk action');
      }
    }
  )
  /**
   * POST /organization/audience/bulk-action
   * Applies a lifecycle action to a selection or to everyone matching a filter.
   */
  .post(
    '/audience/bulk-action',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('json', ZBulkAudienceAction),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const data = c.req.valid('json');
        const result = await applyBulkAudienceAction(orgId, data, user.id);

        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to apply bulk action');
      }
    }
  )
  /**
   * GET /organization/audience/bulk-action/:jobId
   * Status of a queued bulk action. Declared before `/audience/:userId/analytics`
   * so a numeric job id cannot be read as a user id.
   */
  .get('/audience/bulk-action/:jobId', authMiddleware, orgAdminMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const jobId = c.req.param('jobId');
      const pollCount = Number(c.req.query('pollCount') ?? 0);
      const envelope = await getBulkAudienceActionStatus(orgId, jobId, Number.isFinite(pollCount) ? pollCount : 0);

      return c.json({ success: true, data: envelope }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to read bulk action status');
    }
  })
  /**
   * POST /organization/audience/bulk-action/undo
   * Reverses a bulk action across exactly the members it changed.
   */
  .post(
    '/audience/bulk-action/undo',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('json', ZUndoBulkAudienceAction),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const { undoToken } = c.req.valid('json');
        const result = await undoBulkAudienceAction(orgId, undoToken, user.id);

        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to undo bulk action');
      }
    }
  )
  /**
   * DELETE /organization/audience/:memberId
   * Removes a student from the organization
   */
  .delete(
    '/audience/:memberId',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('param', ZRemoveTeamMember),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const { memberId } = c.req.valid('param');

        const deleted = await removeAudienceMember(orgId, memberId, user.id);

        return c.json(
          {
            success: true,
            data: deleted
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to remove audience member');
      }
    }
  )
  /**
   * POST /organization/audience/resend-invite
   * Resends a student org invite email (new token; optional course metadata from last invite)
   */
  .post(
    '/audience/resend-invite',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('json', ZAudienceInviteByEmail),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const data = c.req.valid('json');
        const result = await resendAudienceInvite(orgId, data, user.id);
        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to resend audience invite');
      }
    }
  )
  /**
   * POST /organization/audience/revoke-invite
   * Revokes an active (non-expired) pending student org invite
   */
  .post(
    '/audience/revoke-invite',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('json', ZAudienceInviteByEmail),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const data = c.req.valid('json');
        const result = await revokeAudiencePendingInvite(orgId, data, user.id);
        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to revoke audience invite');
      }
    }
  )
  /**
   * GET /organization/audience/:userId/analytics
   * Gets user analytics for a specific user in an organization
   * Requires authentication and organization membership
   */
  .get(
    '/audience/:userId/analytics',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('param', ZGetUserAnalytics),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const { userId } = c.req.valid('param');
        const analytics = await getUserAnalytics(userId, orgId);

        return c.json(
          {
            success: true,
            data: analytics
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to fetch user analytics');
      }
    }
  )
  /**
   * POST /organization/courses/reorder
   * Persists the manual display order of organization courses (landing page + public catalog)
   * Requires authentication and an organization admin or L&D member. Automation keys use PUT /public-api/v1/organization/landing-page/featured-courses
   */
  .post('/courses/reorder', authMiddleware, orgTeamMemberMiddleware, zValidator('json', ZCourseReorder), async (c) => {
    try {
      const { courses } = c.req.valid('json');
      const orgId = c.req.header('cio-org-id')!;

      await reorderOrgCourses(orgId, courses);

      return c.json({ success: true }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to reorder courses');
    }
  })
  /**
   * GET /organization/courses/enrolled
   * Gets enrolled courses for a user in an organization (used in lms)
   * Requires authentication and organization membership
   */
  .get(
    '/courses/library',
    authMiddleware,
    orgMemberMiddleware,
    zValidator('query', ZGetRecommendedCourses),
    async (c) => {
      try {
        const query = c.req.valid('query');
        const organizationId = c.req.header('cio-org-id')!;
        const profileId = c.get('user')!.id;
        const result = await listCourseLibrary(organizationId, profileId, query);
        const page = query.page ?? 1;
        const limit = query.limit ?? 12;
        const total = result.total;
        const totalPages = Math.ceil(total / limit);
        return c.json({ success: true, data: result.data, pagination: { page, limit, total, totalPages } });
      } catch (error) {
        return handleError(c, error, 'Failed to fetch training library');
      }
    }
  )
  .get(
    '/courses/library/:courseId',
    authMiddleware,
    orgMemberMiddleware,
    zValidator('param', ZCourseLibraryParam),
    async (c) => {
      try {
        const organizationId = c.req.header('cio-org-id')!;
        const profileId = c.get('user')!.id;
        const { courseId } = c.req.valid('param');
        const course = await getCourseLibraryDetails(organizationId, profileId, courseId);
        return c.json({ success: true, data: course });
      } catch (error) {
        return handleError(c, error, 'Failed to fetch course overview');
      }
    }
  )
  .get('/courses/enrolled', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const user = c.get('user')!;

      const orgId = c.req.header('cio-org-id')!;
      const result = await getUserEnrolledCourses(orgId, user.id);

      return c.json(
        {
          success: true,
          data: result
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to fetch courses');
    }
  })
  /**
   * GET /organization/courses/recommended
   * Gets recommended courses (published courses user isn't enrolled in) for a user in an organization (used in lms)
   * Requires authentication and organization membership
   */
  .get(
    '/courses/recommended',
    authMiddleware,
    orgMemberMiddleware,
    zValidator('query', ZGetRecommendedCourses),
    async (c) => {
      try {
        const user = c.get('user')!;
        const { limit, page = 1, search, sort } = c.req.valid('query');

        const orgId = c.req.header('cio-org-id')!;
        const { data, total } = await getRecommendedCourses(orgId, user.id, limit, page, search, sort);

        const resolvedLimit = limit ?? 12;
        const totalPages = resolvedLimit > 0 ? Math.ceil(total / resolvedLimit) : 1;

        return c.json(
          {
            success: true,
            data,
            pagination: { page, limit: resolvedLimit, total, totalPages }
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to fetch recommended courses');
      }
    }
  )
  /**
   * GET /organization/nav-counts
   * Lightweight unfiltered totals for org sidebar items (courses, media, tags)
   */
  .get('/nav-counts', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const user = c.get('user')!;
      const orgId = c.get('orgId');
      const userRole = c.get('userRole');

      if (!orgId) {
        return c.json(
          {
            success: false,
            error: 'Organization context not available',
            code: 'ORG_CONTEXT_MISSING'
          },
          500
        );
      }

      const data = await getOrganizationNavCounts(orgId, user.id, userRole ?? ROLE.ADMIN);

      return c.json(
        {
          success: true,
          data
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to fetch organization nav counts');
    }
  })
  /**
   * GET /organization/courses
   * Gets courses for an organization with role-based filtering (used in dashboard)
   * Requires authentication and organization membership
   */
  .get(
    '/courses',
    authOrAutomationKeyMiddleware,
    orgMemberOrAutomationKeyMiddleware(['course:read']),
    zValidator('query', ZGetOrganizationCoursesQuery),
    async (c) => {
      try {
        const user = c.get('user');
        const orgId = c.get('orgId');
        const userRole = c.get('userRole');
        const automationKey = c.get('automationKey');
        const query = c.req.valid('query');

        if (!orgId) {
          return c.json(
            {
              success: false,
              error: 'Organization context not available',
              code: 'ORG_CONTEXT_MISSING'
            },
            500
          );
        }

        if (automationKey?.type === 'mcp') {
          await assertMcpAutomationUsageAllowed(automationKey, 'list_org_courses');
        }

        const result = await getOrganizationCourses(
          orgId,
          user?.id ?? automationKey?.createdByProfileId ?? '',
          userRole ?? ROLE.ADMIN,
          query
        );

        if (automationKey?.type === 'mcp') {
          await recordMcpAutomationUsage(automationKey, 'list_org_courses', {
            tags: query.tags,
            search: query.search,
            page: query.page,
            limit: query.limit
          });
        }

        return c.json(
          {
            success: true,
            data: result.items,
            pagination: result.pagination,
            query: result.query
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to fetch courses');
      }
    }
  )
  /**
   * PUT /organization
   * Updates an organization (name, avatarUrl)
   * Requires authentication
   */
  .put('/', authMiddleware, orgAdminMiddleware, zValidator('json', ZUpdateOrganization), async (c) => {
    try {
      console.log(c.req.valid('json'));
      const orgId = c.req.header('cio-org-id')!;

      const data = c.req.valid('json') as Partial<TOrganization>;

      const organization = await updateOrg(orgId, data);

      return c.json(
        {
          success: true,
          data: organization
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to update organization');
    }
  })
  /**
   * GET /organization/:orgId/exercises/lms
   * Gets exercises with submissions for a student in an organization
   * Returns exercises from unlocked lessons in courses where the student is a member
   * Requires authentication and organization membership
   */
  .get('/:orgId/exercises/lms', authMiddleware, zValidator('param', ZLMSExercisesParam), async (c) => {
    try {
      const { orgId } = c.req.valid('param');
      const user = c.get('user')!;

      // Check org membership manually since middleware expects header
      const { getUserOrgRole } = await import('@cio/db/queries/organization');
      const roleId = await getUserOrgRole(orgId, user.id);
      if (roleId === null) {
        return c.json(
          {
            success: false,
            error: 'UNAUTHORIZED',
            code: 'UNAUTHORIZED'
          },
          403
        );
      }

      const exercises = await getLMSExercisesService(user.id, orgId);

      return c.json(
        {
          success: true,
          data: exercises
        },
        200
      );
    } catch (error) {
      return handleError(c, error, 'Failed to fetch LMS exercises');
    }
  })
  /**
   * POST /organization/audience/import
   * Imports users into the organization as students with optional course assignment
   * Requires authentication and admin role
   */
  .post(
    '/audience/import',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('json', ZImportAudienceMembers),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const data = c.req.valid('json');

        const result = await importAudienceMembers(orgId, data, user.id);

        return c.json(
          {
            success: true,
            data: result
          },
          201
        );
      } catch (error) {
        return handleError(c, error, 'Failed to import audience members');
      }
    }
  )
  /**
   * POST /organization/audience/assign-courses
   * Assigns existing audience members to one or more courses
   * Requires authentication and admin role
   */
  .post(
    '/audience/assign-courses',
    authMiddleware,
    orgAdminMiddleware,
    zValidator('json', ZAssignAudienceCourses),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const data = c.req.valid('json');

        const result = await assignAudienceToCourses(orgId, data, 'dashboard', c.get('user')?.id ?? null);

        return c.json(
          {
            success: true,
            data: result
          },
          200
        );
      } catch (error) {
        return handleError(c, error, 'Failed to assign audience to courses');
      }
    }
  )
  .route('/automation', automationRouter)
  .route('/webhooks', webhooksRouter)
  .route('/email-templates', studentEmailTemplatesRouter)
  .route('/course-import', courseImportRouter)
  .route('/search', searchRouter)
  .route('/tags', tagsRouter)
  .route('/assets', assetsRouter)
  .route('/ai-tutor', organizationAiTutorRouter)
  .route('/ai-policy', organizationAiPolicyRouter)
  .route('/member/email-notifications', organizationMemberEmailNotificationsRouter)
  .route('/:orgId/quiz', quizRouter);
