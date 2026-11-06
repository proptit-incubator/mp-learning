import { describe, expect, it } from 'vitest';
import { getModelProvider, VOICE_CALL_MODEL_IDS } from '@cio/utils/agent-models';

describe('getModelProvider', () => {
  it('maps every voice-call model to its provider', () => {
    expect(getModelProvider('gemini-3.5-flash-lite')).toBe('google');
    expect(getModelProvider('gpt-6-luna')).toBe('openai');
    expect(getModelProvider('claude-haiku-5-5')).toBe('anthropic');
    expect(VOICE_CALL_MODEL_IDS.every((modelId) => Boolean(getModelProvider(modelId)))).toBe(true);
  });
});
