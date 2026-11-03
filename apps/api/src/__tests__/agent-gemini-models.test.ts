import { afterEach, describe, expect, it, vi } from 'vitest';
import { AGENT_MODELS, UI_PICKER_MODEL_IDS } from '@cio/utils/agent-models';
import { ZAgentChatBody, ZAgentRunCreateBody } from '@cio/utils/validation/agent';
import { insertTokenUsageAndDrainCredits } from '@cio/db/queries/agent';
import { recordTokenUsage } from '@cio/core/services/agent/usage';

vi.mock('@cio/db/queries/agent', () => ({
  getOrgAiPolicy: vi.fn().mockResolvedValue(null),
  insertTokenUsageAndDrainCredits: vi.fn()
}));

vi.mock('@cio/db/queries/organization', () => ({
  getActiveOrganizationPlan: vi.fn().mockResolvedValue(null)
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Gemini course-generation models', () => {
  it.each(['gemini-3.5-flash-lite', 'gemini-3.8-flash'] as const)(
    'accepts %s in both generation entry points',
    (model) => {
      expect(UI_PICKER_MODEL_IDS).toContain(model);
      expect(AGENT_MODELS[model].backendModelId).toBe(model);
      expect(AGENT_MODELS[model].provider).toBe('google');
      expect(ZAgentChatBody.safeParse({ courseId: 'test-course', messages: [], model }).success).toBe(true);
      expect(ZAgentRunCreateBody.safeParse({ courseId: 'test-course', model }).success).toBe(true);
    }
  );

  it('rejects the removed Gemini 3.6 Flash model', () => {
    const model = 'gemini-3.6-flash';

    expect(UI_PICKER_MODEL_IDS).not.toContain(model);
    expect(ZAgentChatBody.safeParse({ courseId: 'test-course', messages: [], model }).success).toBe(false);
    expect(ZAgentRunCreateBody.safeParse({ courseId: 'test-course', model }).success).toBe(false);
  });

  it.each([
    ['gemini-3.5-flash-lite', '2026-10-24T00:00:00Z', 1480],
    ['gemini-3.8-flash', '2026-12-31T23:59:59Z', 2700],
    ['gemini-3.8-flash', '2027-01-01T00:00:00Z', 5400]
  ])('records credit usage for %s at %s', async (model, timestamp, expectedCostUnits) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));

    await recordTokenUsage(
      'test-org',
      'test-user',
      'test-course',
      { promptTokens: 800, completionTokens: 200, totalTokens: 1000 },
      model
    );

    expect(insertTokenUsageAndDrainCredits).toHaveBeenCalledWith(
      expect.objectContaining({ model, promptTokens: 800, completionTokens: 200, costUnits: expectedCostUnits })
    );
  });
});
