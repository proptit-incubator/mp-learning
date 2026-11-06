import { beforeEach, describe, expect, it, vi } from 'vitest';

const getPracticeStatsTotals = vi.fn(async () => ({}));
const listPracticeScoreBuckets = vi.fn(async () => [
  { bucket: 4, count: 2 },
  { bucket: 9, count: 5 }
]);
const listPracticeCriterionAverages = vi.fn(async () => []);
const listPracticeDailyCalls = vi.fn(async () => []);
const listPracticeLearnerStats = vi.fn(async () => []);
const listRecentPracticeScores = vi.fn(async () => []);

vi.mock('@cio/db/queries/practice', () => ({
  getPracticeStatsTotals,
  listPracticeScoreBuckets,
  listPracticeCriterionAverages,
  listPracticeDailyCalls,
  listPracticeLearnerStats,
  listRecentPracticeScores
}));

const { getOrganizationPracticeStats, rangeStart } = await import('./stats');

describe('practice stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts a range at Vietnam midnight', () => {
    const lateEveningUtc = new Date('2026-11-05T20:00:00Z');

    expect(rangeStart(1, lateEveningUtc)).toBe('2026-11-05T17:00:00.000Z');
    expect(rangeStart(7, lateEveningUtc)).toBe('2026-10-30T17:00:00.000Z');
  });

  it('fills every score bucket and queries all time without a start date', async () => {
    const stats = await getOrganizationPracticeStats('org-1', 'all');

    expect(stats.scoreBuckets).toEqual([0, 0, 0, 0, 2, 0, 0, 0, 0, 5]);
    expect(getPracticeStatsTotals).toHaveBeenCalledWith('org-1', { since: null });
    expect(listPracticeDailyCalls).toHaveBeenCalledWith('org-1', 90, { since: null });
  });
});
