import type { Context, Next } from 'hono';
import {
  ZPracticeCallCreate,
  ZPracticeCallParam,
  ZPracticeCallReview,
  ZPracticeStatsQuery
} from '@cio/utils/validation/practice';
import {
  endPracticeCall,
  getPracticeCallDetail,
  getPracticeCapabilities,
  listMyPracticeCalls,
  listOrganizationPracticeCalls,
  openPracticeCallStream,
  regradePracticeCall,
  reviewPracticeCall,
  startPracticeCall
} from '@api/services/practice/call';
import { getMyPracticeStats, getOrganizationPracticeStats } from '@api/services/practice/stats';
import { PracticeCallSession } from '@api/services/practice/call-session';

import { Hono } from '@api/utils/hono';
import { AppError, ErrorCodes, handleError } from '@api/utils/errors';
import { authMiddleware } from '@api/middlewares/auth';
import { orgMemberMiddleware } from '@api/middlewares/org-member';
import { orgTeamMemberMiddleware } from '@api/middlewares/org-team-member';
import { resolveTrustedBrowserOriginForCors } from '@api/utils/origins';
import { upgradeWebSocket } from '@api/utils/websocket';
import { zValidator } from '@hono/zod-validator';

const STREAM_REFUSED_CLOSE_CODE = 4000;

/** Browsers send cookies with cross-site WebSocket handshakes, so the origin is checked here instead of by CORS. */
async function trustedSocketOriginMiddleware(c: Context, next: Next) {
  const origin = c.req.header('origin');

  if (origin && !resolveTrustedBrowserOriginForCors(origin)) {
    return c.json({ success: false, error: 'Origin not allowed', code: ErrorCodes.UNAUTHORIZED }, 403);
  }

  await next();
}

function toRefusalCode(error: unknown): string {
  return error instanceof AppError ? error.code : ErrorCodes.INTERNAL_ERROR;
}

export const practiceCallsRouter = new Hono()
  .get('/capabilities', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const capabilities = await getPracticeCapabilities(orgId);

      return c.json({ success: true, data: capabilities }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice capabilities');
    }
  })
  .get('/', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const user = c.get('user')!;
      const calls = await listMyPracticeCalls(orgId, user.id);

      return c.json({ success: true, data: calls }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice calls');
    }
  })
  .get('/results', authMiddleware, orgTeamMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const calls = await listOrganizationPracticeCalls(orgId);

      return c.json({ success: true, data: calls }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice results');
    }
  })
  .get('/stats', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const user = c.get('user')!;
      const stats = await getMyPracticeStats(orgId, user.id);

      return c.json({ success: true, data: stats }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice stats');
    }
  })
  .get(
    '/results/stats',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('query', ZPracticeStatsQuery),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const { range } = c.req.valid('query');
        const stats = await getOrganizationPracticeStats(orgId, range);

        return c.json({ success: true, data: stats }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to fetch practice statistics');
      }
    }
  )
  .post('/', authMiddleware, orgMemberMiddleware, zValidator('json', ZPracticeCallCreate), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const user = c.get('user')!;
      const orgRoles = c.get('orgRoles');
      const { scenarioId } = c.req.valid('json');
      const call = await startPracticeCall(orgId, { userId: user.id, orgRoles }, scenarioId);

      return c.json({ success: true, data: call }, 201);
    } catch (error) {
      return handleError(c, error, 'Failed to start practice call');
    }
  })
  .get('/:callId', authMiddleware, zValidator('param', ZPracticeCallParam), async (c) => {
    try {
      const user = c.get('user')!;
      const orgRoles = c.get('orgRoles');
      const { callId } = c.req.valid('param');
      const call = await getPracticeCallDetail(callId, { userId: user.id, orgRoles });

      return c.json({ success: true, data: call }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice call');
    }
  })
  .post('/:callId/end', authMiddleware, zValidator('param', ZPracticeCallParam), async (c) => {
    try {
      const user = c.get('user')!;
      const { callId } = c.req.valid('param');
      const call = await endPracticeCall(callId, user.id);

      return c.json({ success: true, data: call }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to end practice call');
    }
  })
  .post('/:callId/grade', authMiddleware, zValidator('param', ZPracticeCallParam), async (c) => {
    try {
      const user = c.get('user')!;
      const orgRoles = c.get('orgRoles');
      const { callId } = c.req.valid('param');
      const call = await regradePracticeCall(callId, { userId: user.id, orgRoles });

      return c.json({ success: true, data: call }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to grade practice call');
    }
  })
  .put(
    '/:callId/review',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('param', ZPracticeCallParam),
    zValidator('json', ZPracticeCallReview),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const user = c.get('user')!;
        const { callId } = c.req.valid('param');
        const review = c.req.valid('json');
        const call = await reviewPracticeCall(orgId, callId, user.id, review);

        return c.json({ success: true, data: call }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to review practice call');
      }
    }
  )
  .get(
    '/:callId/stream',
    authMiddleware,
    trustedSocketOriginMiddleware,
    zValidator('param', ZPracticeCallParam),
    upgradeWebSocket(async (c) => {
      const user = c.get('user')!;
      const callId = c.req.param('callId')!;

      try {
        const { call, scenario, voice } = await openPracticeCallStream(callId, user.id);
        let session: PracticeCallSession | null = null;

        return {
          onOpen: (_event, socket) => {
            session = new PracticeCallSession(call, scenario, socket, voice);
            session.start();
          },
          onMessage: (event) => {
            const { data } = event;

            if (typeof data === 'string' || data instanceof ArrayBuffer) {
              session?.handleMessage(data);
            }
          },
          onClose: () => session?.dispose(),
          onError: () => session?.dispose()
        };
      } catch (error) {
        const refusalCode = toRefusalCode(error);
        if (!(error instanceof AppError)) console.error('practice call stream refused:', error);

        return {
          onOpen: (_event, socket) => socket.close(STREAM_REFUSED_CLOSE_CODE, refusalCode)
        };
      }
    })
  );
