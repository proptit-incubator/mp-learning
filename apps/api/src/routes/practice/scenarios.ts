import {
  ZPracticeScenarioAssistantRequest,
  ZPracticeScenarioCreate,
  ZPracticeScenarioParam,
  ZPracticeScenarioUpdate
} from '@cio/utils/validation/practice';
import {
  addSamplePracticeScenarios,
  createManagedPracticeScenario,
  deleteManagedPracticeScenario,
  listLearnerPracticeScenarios,
  listManagedPracticeScenarios,
  updateManagedPracticeScenario
} from '@api/services/practice/scenario';
import { runScenarioAssistant } from '@api/services/practice/scenario-assistant';

import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { handleError } from '@api/utils/errors';
import { orgMemberMiddleware } from '@api/middlewares/org-member';
import { orgTeamMemberMiddleware } from '@api/middlewares/org-team-member';
import { zValidator } from '@hono/zod-validator';

export const practiceScenariosRouter = new Hono()
  .get('/', authMiddleware, orgMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const scenarios = await listLearnerPracticeScenarios(orgId);

      return c.json({ success: true, data: scenarios }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice scenarios');
    }
  })
  .get('/manage', authMiddleware, orgTeamMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const scenarios = await listManagedPracticeScenarios(orgId);

      return c.json({ success: true, data: scenarios }, 200);
    } catch (error) {
      return handleError(c, error, 'Failed to fetch practice scenarios');
    }
  })
  .post(
    '/assistant',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('json', ZPracticeScenarioAssistantRequest),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const request = c.req.valid('json');
        const result = await runScenarioAssistant(orgId, request);

        return c.json({ success: true, data: result }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to run practice scenario assistant');
      }
    }
  )
  .post('/', authMiddleware, orgTeamMemberMiddleware, zValidator('json', ZPracticeScenarioCreate), async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const user = c.get('user')!;
      const data = c.req.valid('json');
      const scenario = await createManagedPracticeScenario(orgId, user.id, data);

      return c.json({ success: true, data: scenario }, 201);
    } catch (error) {
      return handleError(c, error, 'Failed to create practice scenario');
    }
  })
  .post('/samples', authMiddleware, orgTeamMemberMiddleware, async (c) => {
    try {
      const orgId = c.req.header('cio-org-id')!;
      const user = c.get('user')!;
      const result = await addSamplePracticeScenarios(orgId, user.id);

      return c.json({ success: true, data: result }, 201);
    } catch (error) {
      return handleError(c, error, 'Failed to add sample practice scenarios');
    }
  })
  .put(
    '/:scenarioId',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('param', ZPracticeScenarioParam),
    zValidator('json', ZPracticeScenarioUpdate),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const { scenarioId } = c.req.valid('param');
        const data = c.req.valid('json');
        const scenario = await updateManagedPracticeScenario(orgId, scenarioId, data);

        return c.json({ success: true, data: scenario }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to update practice scenario');
      }
    }
  )
  .delete(
    '/:scenarioId',
    authMiddleware,
    orgTeamMemberMiddleware,
    zValidator('param', ZPracticeScenarioParam),
    async (c) => {
      try {
        const orgId = c.req.header('cio-org-id')!;
        const { scenarioId } = c.req.valid('param');
        const deleted = await deleteManagedPracticeScenario(orgId, scenarioId);

        return c.json({ success: true, data: deleted }, 200);
      } catch (error) {
        return handleError(c, error, 'Failed to delete practice scenario');
      }
    }
  );
