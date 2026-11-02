import { Hono } from '@api/utils/hono';
import { apiKeyMiddleware } from '@api/middlewares/api-key';
import {
  enqueueAssignmentDueReminderScan,
  enqueueRecertificationExpiryScan,
  enqueueSessionReminderScan
} from '@cio/jobs';
import { handleError } from '@api/utils/errors';

export const internalRemindersRouter = new Hono()
  .post('/send-session-reminders', apiKeyMiddleware, async (c) => {
    try {
      const jobId = await enqueueSessionReminderScan();

      return c.json({ success: true, data: { jobId: jobId ?? null } }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to enqueue session reminder scan');
    }
  })
  .post('/send-assignment-reminders', apiKeyMiddleware, async (c) => {
    try {
      const jobId = await enqueueAssignmentDueReminderScan();

      return c.json({ success: true, data: { jobId: jobId ?? null } }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to enqueue assignment reminder scan');
    }
  })
  .post('/reopen-expired-recertifications', apiKeyMiddleware, async (c) => {
    try {
      const jobId = await enqueueRecertificationExpiryScan();

      return c.json({ success: true, data: { jobId: jobId ?? null } }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to enqueue recertification expiry scan');
    }
  });
