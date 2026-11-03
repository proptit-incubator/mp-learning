import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { orgAdminMiddleware } from '@api/middlewares/org-admin';
import { handleError } from '@api/utils/errors';
import { zValidator } from '@hono/zod-validator';
import { ZAiPolicyUpdate } from '@cio/utils/validation/agent';
import { getAiPolicy, isAiConfigured, updateAiPolicy } from '@cio/core/services/agent/usage';

/** The organization's AI switch and monthly limits. `configured` says whether the server has AI at all. */
export const organizationAiPolicyRouter = new Hono()
  .get('/', authMiddleware, orgAdminMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const policy = await getAiPolicy(orgId);

      return c.json({ success: true as const, data: { policy, configured: isAiConfigured() } });
    } catch (error) {
      return handleError(c, error, 'Failed to fetch AI policy');
    }
  })
  .put('/', authMiddleware, orgAdminMiddleware, zValidator('json', ZAiPolicyUpdate), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const policy = await updateAiPolicy(orgId, c.req.valid('json'));

      return c.json({ success: true as const, data: { policy, configured: isAiConfigured() } });
    } catch (error) {
      return handleError(c, error, 'Failed to update AI policy');
    }
  });
