import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getLearningAnalytics } from '@api/services/learning-analytics';
import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';
import { getEmployeeAccess } from '@cio/db/queries/organization';
import { getEmployeeCapabilities } from '@cio/utils/functions/employee-access';
import type { EmployeeRole } from '@cio/utils/validation/organization';

vi.mock('@cio/db/queries/dash', () => ({
  getLearningAnalyticsActivity: vi.fn(),
  getLearningAnalyticsSnapshot: vi.fn()
}));
vi.mock('@cio/db/queries/organization', () => ({ getEmployeeAccess: vi.fn() }));

const ORGANIZATION_SCOPE = { kind: 'organization' } as const;

function grantAccess(roles: EmployeeRole[], facts: { isManager?: boolean } = {}) {
  vi.mocked(getEmployeeAccess).mockResolvedValue({
    roles,
    employeeId: 'employee-1',
    isManager: facts.isManager ?? false,
    ...getEmployeeCapabilities(roles)
  });
}

describe('training report definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grantAccess(['ADMIN']);
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
      departments: []
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
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', ORGANIZATION_SCOPE, 7, {});
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', ORGANIZATION_SCOPE, 90, {});
  });

  it('leaves waived assignments out of the completion rate', async () => {
    const snapshot = await getLearningAnalyticsSnapshot('org-1', ORGANIZATION_SCOPE, {});
    vi.mocked(getLearningAnalyticsSnapshot).mockResolvedValue({
      ...snapshot,
      assignments: 10,
      waived: 2,
      completed: 2
    });

    const report = await getLearningAnalytics('org-1', 'actor-1', 30);

    expect(report.completionRate).toBe(25);
  });

  it('reports no completion rate when every assignment is waived', async () => {
    const snapshot = await getLearningAnalyticsSnapshot('org-1', ORGANIZATION_SCOPE, {});
    vi.mocked(getLearningAnalyticsSnapshot).mockResolvedValue({ ...snapshot, assignments: 3, waived: 3, completed: 0 });

    const report = await getLearningAnalytics('org-1', 'actor-1', 30);

    expect(report.completionRate).toBeNull();
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
      departments: []
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
    ['an admin', ['ADMIN'], {}, ORGANIZATION_SCOPE],
    ['L&D', ['LND'], {}, ORGANIZATION_SCOPE],
    ['HR', ['HR'], {}, ORGANIZATION_SCOPE],
    ['L&D who also manages a team', ['LND'], { isManager: true }, ORGANIZATION_SCOPE],
    ['a department manager', [], { isManager: true }, { kind: 'reports', managerEmployeeId: 'employee-1' }]
  ] as const)('narrows the report of %s to their scope', async (_label, roles, facts, scope) => {
    grantAccess([...roles], facts);

    const report = await getLearningAnalytics('org-1', 'actor-1', 30);

    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledWith('org-1', scope, {});
    expect(getLearningAnalyticsActivity).toHaveBeenCalledWith('org-1', scope, 30, {});
    expect(report.scope).toBe(scope.kind);
  });

  it('refuses employees and people outside the organization before reading data', async () => {
    grantAccess([]);
    await expect(getLearningAnalytics('org-1', 'actor-1', 30)).rejects.toMatchObject({ statusCode: 403 });

    vi.mocked(getEmployeeAccess).mockResolvedValue(null);
    await expect(getLearningAnalytics('org-1', 'actor-1', 30)).rejects.toMatchObject({ statusCode: 403 });

    expect(getLearningAnalyticsSnapshot).not.toHaveBeenCalled();
  });
});
