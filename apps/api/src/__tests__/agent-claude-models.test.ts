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
  vi.clearAllMocks();
});

describe('Claude 5.5 course-generation models', () => {
  it.each(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'] as const)(
    'accepts %s in both generation entry points',
    (model) => {
      expect(UI_PICKER_MODEL_IDS).toContain(model);
      expect(AGENT_MODELS[model].backendModelId).toBe(model);
      expect(AGENT_MODELS[model].provider).toBe('anthropic');
      expect(ZAgentChatBody.safeParse({ courseId: 'test-course', messages: [], model }).success).toBe(true);
      expect(ZAgentRunCreateBody.safeParse({ courseId: 'test-course', model }).success).toBe(true);
    }
  );

  it.each(['claude-sonnet-3-5', 'claude-sonnet-4-6'])('rejects the removed model %s', (model) => {
    expect(UI_PICKER_MODEL_IDS).not.toContain(model);
    expect(ZAgentChatBody.safeParse({ courseId: 'test-course', messages: [], model }).success).toBe(false);
    expect(ZAgentRunCreateBody.safeParse({ courseId: 'test-course', model }).success).toBe(false);
  });

  it.each([
    ['claude-opus-5-5', 800, 200, 14_400],
    ['claude-sonnet-5-5', 800, 200, 7_200],
    ['claude-haiku-5-5', 800, 200, 360],
    ['claude-haiku-5-5', 100_000, 25_000, 45_000],
    ['claude-haiku-5-5', 100_001, 25_000, 225_002]
  ])('records credit usage for %s with %i input tokens', async (model, promptTokens, completionTokens, costUnits) => {
    const totalTokens = promptTokens + completionTokens;

    await recordTokenUsage(
      'test-org',
      'test-user',
      'test-course',
      { promptTokens, completionTokens, totalTokens },
      model
    );

    expect(insertTokenUsageAndDrainCredits).toHaveBeenCalledWith(
      expect.objectContaining({ model, promptTokens, completionTokens, costUnits })
    );
  });
});
