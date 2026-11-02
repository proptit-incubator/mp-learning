import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockOrganization: vi.fn(),
  employeeAccess: vi.fn(),
  lockCourse: vi.fn(),
  library: vi.fn(),
  context: vi.fn(),
  findEmployee: vi.fn(),
  createEnrollments: vi.fn(),
  member: vi.fn(),
  courseWithOrg: vi.fn(),
  email: vi.fn(),
  invalidate: vi.fn(),
  webhook: vi.fn(),
  capture: vi.fn()
}));
vi.mock('@cio/db/drizzle', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@cio/db/queries/course/library', () => ({
  getCourseLibrary: mocks.library,
  lockCourseForEnrollment: mocks.lockCourse
}));
vi.mock('@cio/db/queries/course/employees', () => ({ getCourseEmployeeContext: mocks.context }));
vi.mock('@cio/db/queries/course/enrollment', () => ({
  createEnrollments: mocks.createEnrollments,
  findEmployeeByProfile: mocks.findEmployee,
  getEnrollmentById: vi.fn(),
  listCourseEnrollments: vi.fn(),
  resolveEmployeeIds: vi.fn(),
  revokeEnrollment: vi.fn(),
  updateEnrollmentDueDate: vi.fn(),
  waiveEnrollment: vi.fn()
}));
vi.mock('@cio/db/queries/organization', () => ({
  getEmployeeAccess: mocks.employeeAccess,
  lockEmployeeOrganization: mocks.lockOrganization
}));
vi.mock('@cio/db/queries/group', () => ({ isCourseTeamMemberOrOrgAdmin: vi.fn() }));
vi.mock('@cio/db/queries/course', () => ({ getCourseWithOrgData: mocks.courseWithOrg }));
vi.mock('@api/services/jobs', () => ({ enqueueTransactionalEmail: mocks.email }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: mocks.invalidate }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  emitCourseMemberAddedWebhookEvent: mocks.webhook,
  buildMemberSource: (method: string) => ({ method })
}));
vi.mock('@cio/core/config/dashboard-url', () => ({ getDashboardBaseUrl: () => 'https://learn.example.com' }));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: mocks.capture }));

import { selfEnroll } from '@api/services/course/enrollment';
import { getCourseLibraryDetails, listCourseLibrary } from '@api/services/course/library';

describe('self-enrollment from the training library', () => {
  const user = { id: 'learner', email: 'Learner@example.com' };
  const groupMember = { id: 'member', groupId: 'group', profileId: 'learner', email: 'learner@example.com', roleId: 3 };
  const transaction = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => mocks.member() }) }) })
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation((callback) => callback(transaction));
    mocks.employeeAccess.mockResolvedValue({ employeeId: 'employee' });
    mocks.lockCourse.mockResolvedValue({ metadata: { allowSelfEnrollment: true } });
    mocks.context.mockResolvedValue({ organizationId: 'org', groupId: 'group' });
    mocks.library.mockResolvedValue({ data: [{ hasAccess: false }], total: 1 });
    mocks.findEmployee.mockResolvedValue({ id: 'employee', status: 'ACTIVE', email: 'learner@example.com' });
    mocks.createEnrollments.mockResolvedValue([{ id: 'enrollment', courseId: 'course', employeeId: 'employee' }]);
    mocks.member.mockReturnValue([groupMember]);
    mocks.courseWithOrg.mockResolvedValue({ orgName: 'MP', courseTitle: 'Course', orgSiteName: 'mp' });
  });

  it('creates a SELF enrollment for the employee and marks the event source', async () => {
    const result = await selfEnroll('org', 'course', user);
    expect(result.alreadyJoined).toBe(false);
    expect(mocks.createEnrollments).toHaveBeenCalledWith(
      { courseIds: ['course'], employeeIds: ['employee'], kind: 'SELF' },
      transaction
    );
    expect(mocks.webhook).toHaveBeenCalledWith('course', groupMember, {
      source: { method: 'self_enroll' },
      actorProfileId: 'learner'
    });
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it('does nothing when the learner already has access', async () => {
    mocks.library.mockResolvedValue({ data: [{ hasAccess: true }] });
    expect((await selfEnroll('org', 'course', user)).alreadyJoined).toBe(true);
    expect(mocks.createEnrollments).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('does not notify when a live enrollment of the same kind already exists', async () => {
    mocks.createEnrollments.mockResolvedValue([]);
    expect((await selfEnroll('org', 'course', user)).alreadyJoined).toBe(true);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('rejects people who are not active employees', async () => {
    mocks.findEmployee.mockResolvedValue(null);
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    mocks.findEmployee.mockResolvedValue({ id: 'employee', status: 'DRAFT', email: 'x' });
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.createEnrollments).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts before reading or writing a course', async () => {
    mocks.employeeAccess.mockResolvedValue(null);
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.lockCourse).not.toHaveBeenCalled();
    await expect(listCourseLibrary('org', 'learner')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a course from another organization', async () => {
    mocks.context.mockResolvedValue({ organizationId: 'other', groupId: 'group' });
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.createEnrollments).not.toHaveBeenCalled();
  });

  it('keeps a hidden, draft or removed course undiscoverable', async () => {
    mocks.library.mockResolvedValue({ data: [], total: 0 });
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 404 });
    await expect(getCourseLibraryDetails('org', 'learner', 'course')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rechecks the self-enrollment setting under the course lock', async () => {
    mocks.lockCourse.mockResolvedValue({ metadata: { allowSelfEnrollment: false } });
    await expect(selfEnroll('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.createEnrollments).not.toHaveBeenCalled();
  });

  it('keeps a committed enrollment successful if notification or cache updates fail', async () => {
    mocks.email.mockRejectedValue(new Error('mail unavailable'));
    mocks.invalidate.mockRejectedValue(new Error('cache unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await selfEnroll('org', 'course', user)).alreadyJoined).toBe(false);
    expect(mocks.webhook).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});
