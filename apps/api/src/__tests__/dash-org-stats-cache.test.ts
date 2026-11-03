import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMocks = vi.hoisted(() => ({
  mGet: vi.fn(),
  setEx: vi.fn(),
  incr: vi.fn(),
  del: vi.fn()
}));

vi.mock('@cio/core/config/env', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' }
}));

vi.mock('@cio/core/utils/redis/redis', () => ({
  redis: redisMocks,
  logRedisUnavailableOnce: vi.fn()
}));

vi.mock('@cio/db/queries/dash', () => ({
  getLearningAnalyticsSnapshot: vi.fn(),
  getRecentLearningCompletions: vi.fn(),
  getOrgStudentLoginsByDayOfWeek: vi.fn(),
  getUserLoginStreak: vi.fn()
}));

import { getLearningAnalyticsSnapshot, getRecentLearningCompletions } from '@cio/db/queries/dash';
import { getOrganisationAnalytics } from '@api/services/dash';

const course = (id: string, assigned: number, completed: number, progress: number | null) => ({
  id,
  title: `Course ${id}`,
  isPublished: true,
  recertificationMonths: null,
  assigned,
  progress,
  not_started: 0,
  in_progress: 0,
  completed,
  overdue: 0,
  expired: 0,
  waived: 0
});

const snapshot = {
  employees: 12,
  enrolledEmployees: 10,
  assignments: 14,
  courses: [
    course('a', 4, 1, 40),
    course('b', 10, 5, 70),
    ...['c', 'd', 'e', 'f', 'g', 'h'].map((id) => course(id, 0, 0, null))
  ],
  attention: [],
  batches: [],
  rows: []
};

const completion = {
  profileId: 'profile-1',
  fullname: 'Nguyễn Văn An',
  avatarUrl: null,
  courseId: 'b',
  courseTitle: 'Course b',
  completedAt: '2026-11-01T08:00:00.000Z'
};

const sampleAnalytics = {
  totalCertificates: 2,
  numberOfCourses: 8,
  totalStudents: 10,
  topCourses: [
    { id: 'b', title: 'Course b', enrollments: 10, completion: 70, certification: 50 },
    { id: 'a', title: 'Course a', enrollments: 4, completion: 40, certification: 25 },
    { id: 'c', title: 'Course c', enrollments: 0, completion: 0, certification: 0 },
    { id: 'd', title: 'Course d', enrollments: 0, completion: 0, certification: 0 },
    { id: 'e', title: 'Course e', enrollments: 0, completion: 0, certification: 0 }
  ],
  recentCertifications: [
    {
      id: 'profile-1',
      avatarUrl: null,
      name: 'Nguyễn Văn An',
      courseId: 'b',
      course: 'Course b',
      date: completion.completedAt
    }
  ]
};

describe('getOrganisationAnalytics cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMocks.mGet.mockResolvedValue([null, null]);
    vi.mocked(getLearningAnalyticsSnapshot).mockResolvedValue(snapshot as never);
    vi.mocked(getRecentLearningCompletions).mockResolvedValue({ total: 2, recent: [completion] });
  });

  it('computes from the database on cache miss and writes the payload', async () => {
    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(8);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledTimes(1);
    expect(redisMocks.setEx).toHaveBeenCalledWith(
      'dash:stats:v1:org-1',
      600,
      JSON.stringify({ version: '0', data: sampleAnalytics })
    );
  });

  it('returns cached payload when version matches', async () => {
    redisMocks.mGet.mockResolvedValue([
      '3',
      JSON.stringify({ version: '3', data: { ...sampleAnalytics, numberOfCourses: 5 } })
    ]);

    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(5);
    expect(getLearningAnalyticsSnapshot).not.toHaveBeenCalled();
    expect(redisMocks.setEx).not.toHaveBeenCalled();
  });

  it('treats a version mismatch as a cache miss', async () => {
    redisMocks.mGet.mockResolvedValue([
      '4',
      JSON.stringify({ version: '3', data: { ...sampleAnalytics, numberOfCourses: 5 } })
    ]);

    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(8);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('skips cache read when bustCache is true but still writes', async () => {
    redisMocks.mGet.mockResolvedValue([
      '1',
      JSON.stringify({ version: '1', data: { ...sampleAnalytics, numberOfCourses: 5 } })
    ]);

    const result = await getOrganisationAnalytics('org-1', { kind: 'organization' }, true);

    expect(result.numberOfCourses).toBe(8);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledTimes(1);
    expect(redisMocks.setEx).toHaveBeenCalled();
  });

  it('falls back to the database when redis read fails', async () => {
    redisMocks.mGet.mockRejectedValue(new Error('redis down'));

    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(8);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('returns live data when redis write fails', async () => {
    redisMocks.setEx.mockRejectedValue(new Error('redis down'));

    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(8);
  });

  it('treats malformed cache payload as a miss', async () => {
    redisMocks.mGet.mockResolvedValue(['1', '{not-json']);

    const result = await getOrganisationAnalytics('org-1');

    expect(result.numberOfCourses).toBe(8);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledTimes(1);
  });

  it('computes a manager team live without touching the shared cache', async () => {
    const scope = { kind: 'reports', managerEmployeeId: 'employee-1' } as const;

    const result = await getOrganisationAnalytics('org-1', scope);

    expect(result.totalStudents).toBe(10);
    expect(getLearningAnalyticsSnapshot).toHaveBeenCalledWith('org-1', scope);
    expect(redisMocks.mGet).not.toHaveBeenCalled();
    expect(redisMocks.setEx).not.toHaveBeenCalled();
  });
});
