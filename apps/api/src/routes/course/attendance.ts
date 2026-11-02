import { Hono } from '@api/utils/hono';
import { ZAttendanceUpsert } from '@cio/utils/validation/attendance';
import { authMiddleware } from '@api/middlewares/auth';
import { courseTeamMemberMiddleware } from '@api/middlewares/course-team-member';
import { handleError } from '@api/utils/errors';
import { upsertAttendanceService } from '@api/services/attendance';
import { zValidator } from '@hono/zod-validator';

export const attendanceRouter = new Hono().post(
  '/',
  authMiddleware,
  courseTeamMemberMiddleware,
  zValidator('json', ZAttendanceUpsert),
  async (c) => {
    try {
      const courseId = c.req.param('courseId')!;
      const data = c.req.valid('json');
      const attendance = await upsertAttendanceService(courseId, data);

      return c.json({ success: true, data: attendance }, 201);
    } catch (error) {
      return handleError(c, error, 'Failed to upsert attendance');
    }
  }
);
