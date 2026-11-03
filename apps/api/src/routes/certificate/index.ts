import { Hono } from '@api/utils/hono';
import { createRateLimiter } from '@api/middlewares/rate-limiter';
import { verifyCertificate } from '@api/services/course/certificate';
import { extractClientIp } from '@api/utils/redis/key-generators';
import { handleError } from '@api/utils/errors';
import {
  ZCertificateIdParam,
  ZCertificateRegisterQuery,
  ZCertificateVerifyParam,
  ZRevokeCertificate
} from '@cio/utils/validation/course';
import { authMiddleware } from '@api/middlewares/auth';
import {
  getCertificateRegister,
  restoreOrganizationCertificate,
  revokeOrganizationCertificate
} from '@api/services/course/certificate-register';
import { zValidator } from '@hono/zod-validator';

const verifyRateLimit = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many certificate lookups. Please try again later.',
  keyGenerator: (c) => `certificate-verify:${extractClientIp(c)}`
});

export const certificateRouter = new Hono()
  .get('/verify/:code', verifyRateLimit, zValidator('param', ZCertificateVerifyParam), async (c) => {
    try {
      const data = await verifyCertificate(c.req.valid('param').code);
      c.header('Cache-Control', 'no-store');
      return c.json({ success: true, data });
    } catch (error) {
      return handleError(c, error, 'Failed to verify certificate');
    }
  })
  .get('/register', authMiddleware, zValidator('query', ZCertificateRegisterQuery), async (c) => {
    try {
      const data = await getCertificateRegister(
        c.req.header('cio-org-id') ?? '',
        c.get('user')!.id,
        c.req.valid('query')
      );
      c.header('Cache-Control', 'private, no-store');
      return c.json({ success: true as const, data });
    } catch (error) {
      return handleError(c, error, 'Failed to load the certificate register');
    }
  })
  .post(
    '/register/:certificateId/revoke',
    authMiddleware,
    zValidator('param', ZCertificateIdParam),
    zValidator('json', ZRevokeCertificate),
    async (c) => {
      try {
        const data = await revokeOrganizationCertificate(
          c.req.header('cio-org-id') ?? '',
          c.get('user')!.id,
          c.req.valid('param').certificateId,
          c.req.valid('json').reason
        );
        return c.json({ success: true as const, data });
      } catch (error) {
        return handleError(c, error, 'Failed to revoke the certificate');
      }
    }
  )
  .post('/register/:certificateId/restore', authMiddleware, zValidator('param', ZCertificateIdParam), async (c) => {
    try {
      const data = await restoreOrganizationCertificate(
        c.req.header('cio-org-id') ?? '',
        c.get('user')!.id,
        c.req.valid('param').certificateId
      );
      return c.json({ success: true as const, data });
    } catch (error) {
      return handleError(c, error, 'Failed to restore the certificate');
    }
  });
