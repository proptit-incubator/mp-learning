import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { courseTeamMemberMiddleware } from '@api/middlewares/course-team-member';
import { handleError } from '@api/utils/errors';
import { getCourseVideoRules, updateCourseVideoRules } from '@cio/core/services/course/video-rules';
import { ZCourseVideoRulesUpdate } from '@cio/utils/validation/course/video-rules';
import { zValidator } from '@hono/zod-validator';

export const videoRulesRouter = new Hono()
  .get('/', authMiddleware, courseTeamMemberMiddleware, async (c) => {
    try {
      const courseId = c.req.param('courseId')!;
      const rules = await getCourseVideoRules(courseId);

      return c.json({ success: true, data: rules }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch course video rules');
    }
  })
  .put('/', authMiddleware, courseTeamMemberMiddleware, zValidator('json', ZCourseVideoRulesUpdate), async (c) => {
    try {
      const courseId = c.req.param('courseId')!;
      const payload = c.req.valid('json');
      const rules = await updateCourseVideoRules(courseId, payload);

      return c.json({ success: true, data: rules }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to update course video rules');
    }
  });
