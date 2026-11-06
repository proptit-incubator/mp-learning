import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ZPracticeScenarioCreate } from '@cio/utils/validation/practice';

const listPracticeScenarioTitles = vi.fn(async (): Promise<string[]> => []);
const createPracticeScenarios = vi.fn(async (rows: unknown[]) => rows);

vi.mock('@cio/db/queries/practice', () => ({ listPracticeScenarioTitles, createPracticeScenarios }));

const { PRACTICE_SAMPLE_SCENARIOS } = await import('./sample-scenarios');
const { addSamplePracticeScenarios } = await import('./scenario');
const { TTS_VOICES } = await import('./voice/tts-stream');

describe('practice sample scenarios', () => {
  beforeEach(() => {
    listPracticeScenarioTitles.mockClear();
    createPracticeScenarios.mockClear();
  });

  it('are valid scenarios with known voices and distinct titles', () => {
    const titles = PRACTICE_SAMPLE_SCENARIOS.map((sample) => sample.title);

    expect(new Set(titles).size).toBe(PRACTICE_SAMPLE_SCENARIOS.length);

    for (const sample of PRACTICE_SAMPLE_SCENARIOS) {
      expect(ZPracticeScenarioCreate.safeParse(sample).success).toBe(true);
      expect(TTS_VOICES).toContain(sample.voiceId);
    }
  });

  it('adds only the samples the organization does not have yet', async () => {
    listPracticeScenarioTitles.mockResolvedValueOnce([PRACTICE_SAMPLE_SCENARIOS[0].title]);

    const result = await addSamplePracticeScenarios('org-1', 'profile-1');

    expect(result.added).toBe(PRACTICE_SAMPLE_SCENARIOS.length - 1);
    const insertedRows = createPracticeScenarios.mock.calls[0][0] as Array<{ title: string; organizationId: string }>;
    expect(insertedRows.map((row) => row.title)).not.toContain(PRACTICE_SAMPLE_SCENARIOS[0].title);
    expect(insertedRows.every((row) => row.organizationId === 'org-1')).toBe(true);
  });
});
