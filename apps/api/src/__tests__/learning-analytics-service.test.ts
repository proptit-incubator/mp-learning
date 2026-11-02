import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLearningAnalytics } from '@api/services/learning-analytics';
import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';

vi.mock('@cio/db/queries/dash', () => ({
  getLearningAnalyticsActivity: vi.fn(),
  getLearningAnalyticsSnapshot: vi.fn()
}));

describe('training report definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLearningAnalyticsSnapshot).mockResolvedValue({
      employees: 5,
      enrolledEmployees: 3,
      assignments: 8,
      completed: 2,
      in_progress: 4,
      not_started: 2,
      overdue: 1,
      expired: 0,
      waived: 0,
      courses: [],
      attention: [],
      batches: [],
      rows: []
    });
    vi.mocked(getLearningAnalyticsActivity).mockResolvedValue({
      activeLearners: 1,
      lessonsCompleted: 2,
      submissions: 1,
      daily: []
    });
  });

  it('keeps current completion and employee coverage independent of the activity window', async () => {
    const shortReport = await getLearningAnalytics('org-1', 7);
    const longReport = await getLearningAnalytics('org-1', 90);
    expect(shortReport.completionRate).toBe(25);
    expect(longReport.completionRate).toBe(25);
    expect(shortReport.unassignedEmployees).toBe(2);
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', 7);
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', 90);
  });

  it('reports no completion rate when no learning is assigned', async () => {
    vi.mocked(getLearningAnalyticsSnapshot).mockResolvedValue({
      employees: 1,
      enrolledEmployees: 0,
      assignments: 0,
      completed: 0,
      in_progress: 0,
      not_started: 0,
      overdue: 0,
      expired: 0,
      waived: 0,
      courses: [],
      attention: [],
      batches: [],
      rows: []
    });
    const report = await getLearningAnalytics('org-1', 30);
    expect(report.completionRate).toBeNull();
    expect(report.unassignedEmployees).toBe(1);
  });

  it('rejects incomplete database reads instead of returning fabricated zero activity', async () => {
    vi.mocked(getLearningAnalyticsActivity).mockRejectedValue(new Error('Database unavailable'));
    await expect(getLearningAnalytics('org-1', 30)).rejects.toThrow('Database unavailable');
  });
});
