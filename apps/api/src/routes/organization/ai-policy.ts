import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { orgAdminMiddleware } from '@api/middlewares/org-admin';
import { handleError } from '@api/utils/errors';
import { zValidator } from '@hono/zod-validator';
import { ZAiPolicyUpdate } from '@cio/utils/validation/agent';
import { getAiPolicy, isAiConfigured, updateAiPolicy } from '@cio/core/services/agent/usage';
import { AIProvider, getProviderConfigForProvider } from '@cio/ai-assistant';
import { env } from '@cio/core/config/env';
import type { TAiPolicy } from '@cio/utils/validation/agent';
import { TTS_VOICES } from '@api/services/practice/voice/tts-stream';

/** What the settings page needs next to the policy: which providers have keys and which voices exist. */
function buildPolicyResponse(policy: TAiPolicy) {
  const providers = Object.values(AIProvider).filter((provider) => getProviderConfigForProvider(provider) !== null);

  return {
    policy,
    configured: isAiConfigured(),
    providers,
    voices: [...TTS_VOICES],
    serverDefaultVoice: env.TTS_VOICE_ID
  };
}

/** The organization's AI switch and monthly limits. `configured` says whether the server has AI at all. */
export const organizationAiPolicyRouter = new Hono()
  .get('/', authMiddleware, orgAdminMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const policy = await getAiPolicy(orgId);
      const data = buildPolicyResponse(policy);

      return c.json({ success: true as const, data });
    } catch (error) {
      return handleError(c, error, 'Failed to fetch AI policy');
    }
  })
  .put('/', authMiddleware, orgAdminMiddleware, zValidator('json', ZAiPolicyUpdate), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const policy = await updateAiPolicy(orgId, c.req.valid('json'));
      const data = buildPolicyResponse(policy);

      return c.json({ success: true as const, data });
    } catch (error) {
      return handleError(c, error, 'Failed to update AI policy');
    }
  });
