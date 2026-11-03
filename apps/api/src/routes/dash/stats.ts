import { Hono } from '@api/utils/hono';
import { learningAnalyticsRouter } from './learning-analytics';
import { ZDashAnalyticsRange, ZDashCourseFunnel, ZDashStats, ZLoginActivity } from '@cio/utils/validation/dash';
import { authMiddleware } from '@api/middlewares/auth';
import { getCurrentUserLoginStreak, getOrganisationAnalytics, getStudentLoginActivity } from '@api/services/dash';
import { resolveLearningAnalyticsScope } from '@api/services/learning-analytics';
import { handleError } from '@api/utils/errors';
import { orgAdminMiddleware } from '@api/middlewares/org-admin';
import { orgMemberMiddleware } from '@api/middlewares/org-member';
import { zValidator } from '@hono/zod-validator';
import { getCountryBreakdown, getCourseFunnel, getLandingStats, getTopCoursesByViews } from '@api/services/analytics';

export const dashAnalyticsRouter = new Hono()
  .route('/', learningAnalyticsRouter)
  .get('/stats', authMiddleware, orgMemberMiddleware, zValidator('query', ZDashStats), async (c) => {
    try {
      const { bust } = c.req.valid('query');
      const orgId = c.get('orgId')!;

      const scope = await resolveLearningAnalyticsScope(orgId, c.get('user')!.id);
      const result = await getOrganisationAnalytics(orgId, scope, bust);

      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load organisation analytics');
    }
  })
  .get('/login-activity', authMiddleware, orgAdminMiddleware, zValidator('query', ZLoginActivity), async (c) => {
    try {
      const { days } = c.req.valid('query');
      const orgId = c.req.header('cio-org-id')!;

      const result = await getStudentLoginActivity(orgId, days);

      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load login activity');
    }
  })
  .get('/login-streak', authMiddleware, async (c) => {
    try {
      const user = c.get('user')!;
      const result = await getCurrentUserLoginStreak(user.id);

      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load login streak');
    }
  })
  .get('/landing-stats', authMiddleware, orgMemberMiddleware, zValidator('query', ZDashAnalyticsRange), async (c) => {
    try {
      const { days } = c.req.valid('query');
      const orgId = c.get('orgId')!;
      const bust = c.req.query('bust') === '1';
      const result = await getLandingStats(orgId, days, bust);

      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load landing stats');
    }
  })
  .get(
    '/country-breakdown',
    authMiddleware,
    orgMemberMiddleware,
    zValidator('query', ZDashAnalyticsRange),
    async (c) => {
      try {
        const { days } = c.req.valid('query');
        const orgId = c.get('orgId')!;
        const bust = c.req.query('bust') === '1';
        const result = await getCountryBreakdown(orgId, days, bust);

        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to load country breakdown');
      }
    }
  )
  .get('/course-funnel', authMiddleware, orgMemberMiddleware, zValidator('query', ZDashCourseFunnel), async (c) => {
    try {
      const { days, courseId } = c.req.valid('query');
      const orgId = c.get('orgId')!;
      const bust = c.req.query('bust') === '1';
      const result = await getCourseFunnel(orgId, days, courseId, bust);

      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load course funnel');
    }
  })
  .get('/top-courses', authMiddleware, orgMemberMiddleware, zValidator('query', ZDashAnalyticsRange), async (c) => {
    try {
      const { days } = c.req.valid('query');
      const orgId = c.get('orgId')!;
      const bust = c.req.query('bust') === '1';
      const result = await getTopCoursesByViews(orgId, days, bust);

      c.header('Cache-Control', 'no-store');
      return c.json({ success: true, data: result }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load top courses');
    }
  });
