import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { getLearningAnalytics, getLearningAssignmentsPage } from '@api/services/learning-analytics';
import { handleError } from '@api/utils/errors';
import { ZLearningAnalyticsQuery, ZLearningAssignmentsQuery } from '@cio/utils/validation/dash';
import { zValidator } from '@hono/zod-validator';

export const learningAnalyticsRouter = new Hono()
  .get('/learning-analytics', authMiddleware, zValidator('query', ZLearningAnalyticsQuery), async (context) => {
    try {
      const orgId = context.req.header('cio-org-id');
      if (!orgId) {
        return context.json({ success: false, error: 'Organization ID is required', code: 'ORG_ID_REQUIRED' }, 400);
      }

      const { days, departmentId } = context.req.valid('query');
      const report = await getLearningAnalytics(orgId, context.get('user')!.id, days, { departmentId });
      context.header('Cache-Control', 'private, no-store');
      return context.json({ success: true, data: report });
    } catch (error) {
      return handleError(context, error, 'Failed to load learning analytics');
    }
  })
  .get(
    '/learning-analytics/assignments',
    authMiddleware,
    zValidator('query', ZLearningAssignmentsQuery),
    async (context) => {
      try {
        const orgId = context.req.header('cio-org-id');
        if (!orgId) {
          return context.json({ success: false, error: 'Organization ID is required', code: 'ORG_ID_REQUIRED' }, 400);
        }

        const data = await getLearningAssignmentsPage(orgId, context.get('user')!.id, context.req.valid('query'));
        context.header('Cache-Control', 'private, no-store');
        return context.json({ success: true, data });
      } catch (error) {
        return handleError(context, error, 'Failed to load assignments');
      }
    }
  );
