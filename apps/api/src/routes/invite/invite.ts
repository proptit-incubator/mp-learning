import { getPendingOrgInviteForUser } from '@api/services/organization/invite';

import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { createRateLimiter } from '@api/middlewares/rate-limiter';
import { handleError } from '@api/utils/errors';
import { extractClientIp } from '@api/utils/redis/key-generators';

const pendingInviteRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many pending invite requests. Please try again later.',
  keyGenerator: (c) => {
    const user = c.get('user');
    return `invite_pending:${user?.id ?? extractClientIp(c)}`;
  }
});

export const inviteRouter = new Hono()
  /**
   * GET /invite/organization/pending
   * Returns the active pending org invite for the currently logged-in user.
   */
  .get('/organization/pending', authMiddleware, pendingInviteRateLimit, async (c) => {
    try {
      const user = c.get('user')!;
      const orgId = c.req.header('cio-org-id');

      if (!orgId || !user.email) {
        return c.json({ success: true, data: null }, 200);
      }

      const pendingInvite = await getPendingOrgInviteForUser(orgId, user.email);

      return c.json({ success: true, data: pendingInvite }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to load pending invite');
    }
  });
