import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLearningAnalytics } from '@api/services/learning-analytics';
import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';
import { getEmployeeAccess } from '@cio/db/queries/organization';

vi.mock('@cio/db/queries/dash', () => ({
  getLearningAnalyticsActivity: vi.fn(),
  getLearningAnalyticsSnapshot: vi.fn()
}));
vi.mock('@cio/db/queries/organization', () => ({ getEmployeeAccess: vi.fn() }));

const ORGANIZATION_SCOPE = { kind: 'organization' };

function grantAccess(role: string) {
  vi.mocked(getEmployeeAccess).mockResolvedValue({
    role,
    employeeId: 'employee-1',
    canManage: role === 'ADMIN' || role === 'HR'
  });
}

describe('training report definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grantAccess('ADMIN');
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
    const shortReport = await getLearningAnalytics('org-1', 'actor-1', 7);
    const longReport = await getLearningAnalytics('org-1', 'actor-1', 90);
    expect(shortReport.completionRate).toBe(25);
    expect(longReport.completionRate).toBe(25);
    expect(shortReport.unassignedEmployees).toBe(2);
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', ORGANIZATION_SCOPE, 7);
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', ORGANIZATION_SCOPE, 90);
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
    const report = await getLearningAnalytics('org-1', 'actor-1', 30);
    expect(report.completionRate).toBeNull();
    expect(report.unassignedEmployees).toBe(1);
  });

  it('rejects incomplete database reads instead of returning fabricated zero activity', async () => {
    vi.mocked(getLearningAnalyticsActivity).mockRejectedValue(new Error('Database unavailable'));
    await expect(getLearningAnalytics('org-1', 'actor-1', 30)).rejects.toThrow('Database unavailable');
  });

  it.each([
    ['ADMIN', ORGANIZATION_SCOPE],
    ['HR', ORGANIZATION_SCOPE],
    ['TUTOR', { kind: 'courses', teamProfileId: 'actor-1' }],
    ['MANAGER', { kind: 'reports', managerEmployeeId: 'employee-1' }]
  ])('narrows the report of a %s to their scope', async (role, scope) => {
    grantAccess(role);

    const report = await getLearningAnalytics('org-1', 'actor-1', 30);

    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledWith('org-1', scope);
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', scope, 30);
    expect(report.scope).toBe(scope.kind);
  });

  it('refuses employees and people outside the organization before reading data', async () => {
    grantAccess('EMPLOYEE');
    await expect(getLearningAnalytics('org-1', 'actor-1', 30)).rejects.toMatchObject({ statusCode: 403 });

    vi.mocked(getEmployeeAccess).mockResolvedValue(null);
    await expect(getLearningAnalytics('org-1', 'actor-1', 30)).rejects.toMatchObject({ statusCode: 403 });

    expect(getLearningAnalyticsSnapshot).not.toHaveBeenCalled();
  });
});
