import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cio/db/queries/agent', () => ({
  aggregateTokenUsageByUser: vi.fn(),
  countRequests: vi.fn(),
  getDailyTokenUsageHistory: vi.fn(),
  getMonthlyTokenUsage: vi.fn(),
  getCapStatusSummary: vi.fn(),
  getCourseAiTutorOverride: vi.fn(),
  getLearnerCapEvents: vi.fn(),
  getLearnerCourseBreakdown: vi.fn(),
  getLearnerDailyUsage: vi.fn(),
  getLearnerLeaderboard: vi.fn(),
  getMonthlyTutorCount: vi.fn(),
  getOrgAiPolicy: vi.fn(),
  getOrgAiTutorSettings: vi.fn(),
  getOrgCreditBalance: vi.fn(),
  incrementMonthlyTutorCount: vi.fn(),
  recordCapEvent: vi.fn(),
  updateCourseAiTutorOverride: vi.fn(),
  updateOrgAiTutorSettings: vi.fn(),
  getUserMonthlyTokenUsage: vi.fn(),
  insertTokenUsageAndDrainCredits: vi.fn(),
  setOrgAiPolicy: vi.fn(),
  summarizePurchases: vi.fn(),
  upsertCreditBalance: vi.fn()
}));

vi.mock('@cio/db/queries/organization', () => ({ getActiveOrganizationPlan: vi.fn() }));

vi.mock('@cio/ai-assistant/providers', () => ({ pickAnyConfiguredProvider: vi.fn() }));

import { pickAnyConfiguredProvider } from '@cio/ai-assistant/providers';
import { assertAiEnabled, enforceTokenBalance, getTokenBalance, updateAiPolicy } from '@cio/core/services/agent/usage';
import {
  getMonthlyTokenUsage,
  getMonthlyTutorCount,
  getOrgAiPolicy,
  recordCapEvent,
  getOrgCreditBalance,
  getUserMonthlyTokenUsage,
  setOrgAiPolicy
} from '@cio/db/queries/agent';
import { DEFAULT_AI_POLICY, resolveAiPolicy } from '@cio/utils/validation/agent';
import { aiEnabledMiddleware } from '@api/middlewares/ai-enabled';
import { enforceStudentTutorPolicy, getStudentTutorStatus } from '@api/services/agent/tutor-usage';

const ORG_ID = 'org-1';
const USER_ID = 'user-1';

function usage({ org, user, credits = 0 }: { org: number; user: number; credits?: number }) {
  vi.mocked(getMonthlyTokenUsage).mockResolvedValue(org);
  vi.mocked(getUserMonthlyTokenUsage).mockResolvedValue(user);
  vi.mocked(getOrgCreditBalance).mockResolvedValue(credits);
}

beforeEach(() => {
  vi.mocked(getOrgAiPolicy).mockResolvedValue({ monthlyLimit: 1_000, authorMonthlyLimit: 300 });
  vi.mocked(pickAnyConfiguredProvider).mockReturnValue({ provider: 'google', apiKey: 'key', model: 'm' } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('resolveAiPolicy', () => {
  it('fills what the organization never set with the defaults', () => {
    expect(resolveAiPolicy(null)).toEqual(DEFAULT_AI_POLICY);
    expect(resolveAiPolicy({ learnerMonthlyMessages: 20 })).toEqual({
      ...DEFAULT_AI_POLICY,
      learnerMonthlyMessages: 20
    });
  });

  it('falls back to the defaults when the stored value is malformed', () => {
    expect(resolveAiPolicy({ monthlyLimit: -5 })).toEqual(DEFAULT_AI_POLICY);
  });
});

describe('getTokenBalance', () => {
  it('uses the organization monthly limit as the allowance', async () => {
    usage({ org: 400, user: 0 });

    await expect(getTokenBalance(ORG_ID)).resolves.toMatchObject({ used: 400, allowance: 1_000, remaining: 600 });
  });

  it("caps what remains by the person's own limit", async () => {
    usage({ org: 400, user: 250 });

    await expect(getTokenBalance(ORG_ID, USER_ID)).resolves.toMatchObject({
      remaining: 50,
      user: { used: 250, limit: 300 }
    });
  });
});

describe('enforceTokenBalance', () => {
  it('lets an author through while both limits have room', async () => {
    usage({ org: 400, user: 100 });

    await expect(enforceTokenBalance(ORG_ID, USER_ID)).resolves.toMatchObject({ remaining: 200 });
  });

  it('stops everyone once the organization limit is spent', async () => {
    usage({ org: 1_000, user: 0 });

    await expect(enforceTokenBalance(ORG_ID)).rejects.toMatchObject({ code: 'TOKEN_LIMIT_REACHED', statusCode: 429 });
  });

  it('stops one author at their own limit while the organization still has room', async () => {
    usage({ org: 500, user: 300 });

    await expect(enforceTokenBalance(ORG_ID, USER_ID)).rejects.toMatchObject({ code: 'USER_AI_LIMIT_REACHED' });
    await expect(enforceTokenBalance(ORG_ID)).resolves.toBeTruthy();
  });

  it('has no per-person cap when the policy sets none', async () => {
    vi.mocked(getOrgAiPolicy).mockResolvedValue({ monthlyLimit: 1_000, authorMonthlyLimit: null });
    usage({ org: 500, user: 5_000 });

    await expect(enforceTokenBalance(ORG_ID, USER_ID)).resolves.toMatchObject({ remaining: 500 });
  });
});

describe('assertAiEnabled', () => {
  it('refuses when the server was started with AI_ENABLED=false', async () => {
    vi.stubEnv('AI_ENABLED', 'false');

    await expect(assertAiEnabled(ORG_ID)).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED', statusCode: 503 });
  });

  it('refuses when no provider key is set', async () => {
    vi.mocked(pickAnyConfiguredProvider).mockReturnValue(null);

    await expect(assertAiEnabled(ORG_ID)).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  });

  it('refuses when the organization turned AI off', async () => {
    vi.mocked(getOrgAiPolicy).mockResolvedValue({ enabled: false });

    await expect(assertAiEnabled(ORG_ID)).rejects.toMatchObject({ code: 'AI_DISABLED', statusCode: 403 });
  });
});

describe('updateAiPolicy', () => {
  it('merges the change into the stored policy', async () => {
    vi.mocked(setOrgAiPolicy).mockImplementation(async (_orgId, policy) => policy);

    const policy = await updateAiPolicy(ORG_ID, { enabled: false });

    expect(policy).toEqual({ ...DEFAULT_AI_POLICY, monthlyLimit: 1_000, authorMonthlyLimit: 300, enabled: false });
    expect(setOrgAiPolicy).toHaveBeenCalledWith(ORG_ID, policy);
  });
});

describe('aiEnabledMiddleware', () => {
  const app = new Hono()
    .use('*', aiEnabledMiddleware)
    .get('/usage', (c) => c.json({ ok: true }))
    .post('/chat', (c) => c.json({ ok: true }));
  const headers = { 'cio-org-id': ORG_ID };

  it('blocks model calls when the organization turned AI off', async () => {
    vi.mocked(getOrgAiPolicy).mockResolvedValue({ enabled: false });

    const response = await app.request('/chat', { method: 'POST', headers });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: 'AI_DISABLED' });
  });

  it('still answers reads so the dashboard can explain why', async () => {
    vi.mocked(getOrgAiPolicy).mockResolvedValue({ enabled: false });

    expect((await app.request('/usage', { headers })).status).toBe(200);
  });

  it('lets model calls through when AI is on', async () => {
    expect((await app.request('/chat', { method: 'POST', headers })).status).toBe(200);
  });
});

describe('learner tutor messages', () => {
  beforeEach(() => {
    vi.mocked(getOrgAiPolicy).mockResolvedValue({ monthlyLimit: 1_000, learnerMonthlyMessages: 5 });
    usage({ org: 0, user: 0 });
  });

  it('stops a learner at the monthly message count the organization set', async () => {
    vi.mocked(getMonthlyTutorCount).mockResolvedValue({ messageCount: 5, capHitAt: null } as never);

    await expect(enforceStudentTutorPolicy(ORG_ID, 'course-1', USER_ID)).rejects.toMatchObject({
      code: 'LEARNER_CAP_REACHED'
    });
    expect(recordCapEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'cap_reached' }));
  });

  it('reports the remaining messages to the learner', async () => {
    vi.mocked(getMonthlyTutorCount).mockResolvedValue({ messageCount: 2, capHitAt: null } as never);

    await expect(getStudentTutorStatus(ORG_ID, 'course-1', USER_ID)).resolves.toMatchObject({
      cap: 5,
      capRemaining: 3,
      enforced: true
    });
  });
});
