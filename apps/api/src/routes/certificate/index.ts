import { Hono } from '@api/utils/hono';
import { createRateLimiter } from '@api/middlewares/rate-limiter';
import { verifyCertificate } from '@api/services/course/certificate';
import { extractClientIp } from '@api/utils/redis/key-generators';
import { handleError } from '@api/utils/errors';
import { ZCertificateVerifyParam } from '@cio/utils/validation/course';
import { zValidator } from '@hono/zod-validator';

const verifyRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many certificate lookups. Please try again later.',
  keyGenerator: (c) => `certificate-verify:${extractClientIp(c)}`
});

export const certificateRouter = new Hono().get(
  '/verify/:code',
  verifyRateLimit,
  zValidator('param', ZCertificateVerifyParam),
  async (c) => {
    try {
      const data = await verifyCertificate(c.req.valid('param').code);
      c.header('Cache-Control', 'no-store');
      return c.json({ success: true, data });
    } catch (error) {
      return handleError(c, error, 'Failed to verify certificate');
    }
  }
);
