import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { assertAiEnabled } from '@cio/core/services/agent/usage';
import { AppError } from '@api/utils/errors';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Refuses every request that would call a model when the server has no AI or the organization turned it off.
 * Reads (status, usage, history) still answer so the dashboard can explain why.
 */
export const aiEnabledMiddleware = async (c: Context, next: Next) => {
  const orgId = c.req.header('cio-org-id');
  if (READS.has(c.req.method) || !orgId) return next();

  try {
    await assertAiEnabled(orgId);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        { success: false, error: error.message, code: error.code },
        error.statusCode as ContentfulStatusCode
      );
    }
    throw error;
  }

  return next();
};
