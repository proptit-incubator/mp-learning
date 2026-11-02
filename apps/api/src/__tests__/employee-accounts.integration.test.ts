import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cio/email', async (importOriginal) => {
  const original = await importOriginal<typeof import('@cio/email')>();
  return { ...original, sendEmail: vi.fn(async () => [{ success: true }]) };
});

vi.mock('@api/services/jobs', async (importOriginal) => {
  const original = await importOriginal<typeof import('@api/services/jobs')>();
  return { ...original, enqueueTransactionalEmail: vi.fn(async () => ({ jobIds: ['test-email'] })) };
});

vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: vi.fn() }));

const testDatabaseUrl = process.env.EMPLOYEE_TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('employee accounts on an isolated PostgreSQL database', () => {
  let database: typeof import('@cio/db/drizzle');
  let queries: typeof import('@cio/db/queries/organization');
  let services: typeof import('@api/services/organization/employees');
  let auth: (typeof import('@cio/db/auth'))['auth'];
  let resolveSignIn: (typeof import('@api/utils/employee-sign-in'))['resolveEmployeeSignInRequest'];
  let mail: typeof import('@cio/email');
  let enrollment: typeof import('@api/services/course/enrollment');
  let enrollmentQueries: typeof import('@cio/db/queries/course/enrollment');
  const organizationId = randomUUID();
  const otherOrgId = randomUUID();
  const administratorId = randomUUID();
  let counter = 0;

  beforeAll(async () => {
    const pathname = new URL(testDatabaseUrl!).pathname;
    if (!pathname.endsWith('_test')) throw new Error('Employee integration tests require a database ending in _test');

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    process.env.PUBLIC_IS_SELFHOSTED = 'true';
    process.env.DASHBOARD_ORIGIN = 'http://localhost:3082';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== decodeURIComponent(pathname.slice(1))) {
      throw new Error('Employee integration tests are connected to an unexpected database');
    }

    queries = await import('@cio/db/queries/organization');
    services = await import('@api/services/organization/employees');
    auth = (await import('@cio/db/auth')).auth;
    resolveSignIn = (await import('@api/utils/employee-sign-in')).resolveEmployeeSignInRequest;
    mail = await import('@cio/email');
    enrollment = await import('@api/services/course/enrollment');
    enrollmentQueries = await import('@cio/db/queries/course/enrollment');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
    await database.db.insert(database.organization).values([
      { id: organizationId, name: 'Employee integration', siteName: `employee-${organizationId}` },
      { id: otherOrgId, name: 'Other organization' }
    ]);
    await database.db.insert(database.user).values({
      id: administratorId,
      email: `${administratorId}@example.com`,
      name: 'Administrator',
      emailVerified: true
    });
    await database.db.insert(database.profile).values({
      id: administratorId,
      fullname: 'Administrator',
      username: administratorId,
      email: `${administratorId}@example.com`,
      isEmailVerified: true
    });
    await database.db.insert(database.organizationmember).values({
      organizationId,
      profileId: administratorId,
      email: `${administratorId}@example.com`,
      roleId: 1,
      verified: true
    });
  }, 30000);

  beforeEach(() => {
    vi.mocked(mail.sendEmail).mockClear();
    vi.mocked(mail.sendEmail).mockResolvedValue([{ success: true }] as never);
  });

  async function draft(overrides: Partial<Parameters<typeof services.createEmployee>[2]> = {}) {
    counter++;
    const employeeCode = `MPTEST${counter}-${organizationId.slice(0, 6).toUpperCase()}`;
    const email = `${employeeCode.toLowerCase()}@example.com`;
    return services.createEmployee(organizationId, administratorId, {
      employeeCode,
      email,
      fullname: 'Test Employee',
      department: 'Operations',
      jobTitle: 'Specialist',
      managerId: null,
      startDate: '',
      roles: [],
      sendActivation: false,
      ...overrides
    });
  }

  function activationToken() {
    const calls = vi.mocked(mail.sendEmail).mock.calls;
    const config = calls[calls.length - 1][1];
    const content = (config.fields as { activationUrl: string }).activationUrl;
    const match = content.match(/token=([a-f0-9]{64})/);
    if (!match) throw new Error('Missing activation token in test email');

    return match[1];
  }

  async function assign(courseIds: string[], employeeIds: string[]) {
    return enrollment.assignCourses(organizationId, administratorId, {
      courseIds,
      employeeIds,
      message: '',
      sendEmail: false
    });
  }

  async function activateDraft(
    overrides: Partial<Parameters<typeof services.createEmployee>[2]> = {},
    courseIds: string[] = []
  ) {
    const created = await draft({ ...overrides, sendActivation: true });
    if (courseIds.length) await assign(courseIds, [created.employee.id]);
    const token = activationToken();
    await services.activateEmployee(token, 'Employee-password-2026');
    const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
    return { ...created.employee, profileId: identity.member!.profileId! };
  }

  it('creates a draft without credentials or an email, and prevents privilege escalation', async () => {
    const created = await draft();
    expect(created.employee.status).toBe('DRAFT');
    expect(mail.sendEmail).not.toHaveBeenCalled();
    const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
    expect(identity.account).toBeNull();
    expect(identity.member?.status).toBe('DEACTIVATED');
    const hr = await activateDraft({ roles: ['HR'] });
    await expect(
      services.createEmployee(organizationId, hr.profileId, {
        employeeCode: 'ESCALATION',
        email: 'escalation@example.com',
        fullname: 'Escalation',
        roles: ['ADMIN'],
        department: '',
        jobTitle: '',
        managerId: null,
        startDate: '',
        sendActivation: false
      })
    ).rejects.toThrow('employees.errors.forbidden');
  });

  it('rotates links, rejects expired and replayed tokens, and rolls back failed activation', async () => {
    const created = await draft({ sendActivation: true });
    const firstToken = activationToken();
    await services.sendEmployeeActivation(organizationId, administratorId, created.employee.id);
    const secondToken = activationToken();
    await expect(services.activateEmployee(firstToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    await expect(services.activateEmployee(secondToken)).rejects.toThrow('employees.errors.password');
    expect(await services.previewEmployeeActivation(secondToken)).toMatchObject({
      employeeCode: created.employee.employeeCode
    });
    await services.activateEmployee(secondToken, 'Employee-password-2026');
    await expect(services.activateEmployee(secondToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    const expired = await draft({ sendActivation: true });
    const expiredToken = activationToken();
    await database.db
      .update(database.employeeActivation)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(database.eq(database.employeeActivation.employeeId, expired.employee.id));
    await expect(services.activateEmployee(expiredToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    const departed = await draft({ sendActivation: true });
    const canceledToken = activationToken();
    await services.setEmployeeStatus(organizationId, administratorId, departed.employee.id, 'LEFT', 'Joining canceled');
    const restored = await services.setEmployeeStatus(
      organizationId,
      administratorId,
      departed.employee.id,
      'ACTIVE',
      'Joining resumed'
    );
    expect(restored.status).toBe('DRAFT');
    await expect(services.activateEmployee(canceledToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    await services.sendEmployeeActivation(organizationId, administratorId, departed.employee.id);
    await services.activateEmployee(activationToken(), 'Employee-password-2026');
  });

  it('allows exactly one concurrent activation and blocks ordinary self-registration', async () => {
    const created = await draft({ sendActivation: true });
    const token = activationToken();
    const signup = await auth.handler(
      new Request('http://localhost:3082/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3082' },
        body: JSON.stringify({ email: created.employee.email, password: 'Employee-password-2026', name: 'Bypass' })
      })
    );
    expect(signup.ok).toBe(false);
    const attempts = await Promise.allSettled([
      services.activateEmployee(token, 'Employee-password-2026'),
      services.activateEmployee(token, 'Employee-password-2026')
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
  });

  it('signs in using a normalized employee code and invalidates the session on suspension', async () => {
    const staff = await activateDraft();
    const request = new Request('http://localhost:3082/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3082' },
      body: JSON.stringify({ email: staff.employeeCode.toLowerCase(), password: 'Employee-password-2026' })
    });
    const normalized = await resolveSignIn(request);
    const response = await auth.handler(normalized);
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const headers = new Headers({ cookie });
    expect(await auth.api.getSession({ headers })).not.toBeNull();
    await services.setEmployeeStatus(organizationId, administratorId, staff.id, 'SUSPENDED', 'Access review');
    expect(await auth.api.getSession({ headers })).toBeNull();
    expect(await queries.canEmployeeSignIn(staff.profileId)).toBe(false);
    const blocked = await resolveSignIn(request);
    const blockedResponse = await auth.handler(blocked);
    expect(blockedResponse.ok).toBe(false);
    await services.setEmployeeStatus(organizationId, administratorId, staff.id, 'ACTIVE', 'Review completed');
    expect(await queries.canEmployeeSignIn(staff.profileId)).toBe(true);
  });

  it('scopes managers to direct reports, refuses foreign assignments and rolls back duplicates', async () => {
    const manager = await activateDraft();
    const report = await draft({ managerId: manager.id });
    const outsider = await draft();
    const roster = await services.getEmployees(organizationId, manager.profileId, {
      search: '',
      department: '',
      page: 1,
      limit: 100
    });
    expect(roster.rows.map((staff) => staff.id)).toEqual([report.employee.id]);
    await expect(services.getEmployeeDetails(organizationId, manager.profileId, outsider.employee.id)).rejects.toThrow(
      'employees.errors.forbidden'
    );
    await expect(services.getEmployeeDetails(otherOrgId, administratorId, report.employee.id)).rejects.toThrow(
      'employees.errors.forbidden'
    );
    await expect(
      enrollment.assignCourses(organizationId, administratorId, {
        courseIds: [randomUUID()],
        employeeIds: [report.employee.id],
        message: '',
        sendEmail: false
      })
    ).rejects.toThrow('Course unavailable');
    await expect(
      enrollment.assignCourses(organizationId, manager.profileId, {
        courseIds: [randomUUID()],
        employeeIds: [report.employee.id],
        message: '',
        sendEmail: false
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    const duplicateEmail = `duplicate-${organizationId}@example.com`;
    await expect(draft({ employeeCode: outsider.employee.employeeCode, email: duplicateEmail })).rejects.toThrow();
    const orphan = await queries.findEmployeeAccount(duplicateEmail, organizationId);
    expect(orphan.member).toBeNull();
  });

  it('reports mail failure honestly and keeps invalid import rows separate', async () => {
    vi.mocked(mail.sendEmail).mockResolvedValue([{ success: false }] as never);
    const created = await draft({ sendActivation: true });
    expect(created.delivery?.sent).toBe(false);
    expect((await queries.findEmployee(organizationId, created.employee.id))?.status).toBe('DRAFT');
    const rows = [
      { employeeCode: 'IMPORT01', fullname: 'Import Employee', email: `import-${organizationId}@example.com` },
      { employeeCode: 'BAD CODE', email: 'invalid' }
    ];
    const preview = await services.importEmployees(organizationId, administratorId, rows, true);
    expect(preview.rows.map((row) => row.success)).toEqual([true, false]);
    const imported = await services.importEmployees(organizationId, administratorId, rows, false);
    expect(imported.rows.map((row) => row.success)).toEqual([true, false]);
    const retry = await services.importEmployees(organizationId, administratorId, rows.slice(0, 1), false);
    expect(retry.rows[0].success).toBe(false);
  });

  it('rolls back credential creation and token consumption when enrollment fails, then reports ordinary course completion', async () => {
    const groupId = randomUUID();
    const courseId = randomUUID();
    await database.db.insert(database.group).values({ id: groupId, name: 'Employee course group', organizationId });
    await database.db
      .insert(database.course)
      .values({ id: courseId, title: 'Employee onboarding', description: 'Integration course', groupId });
    const created = await draft({ sendActivation: true });
    await assign([courseId], [created.employee.id]);
    const token = activationToken();
    await database.db.execute(
      database.sql`CREATE FUNCTION employee_test_fail_group() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'enrollment test failure'; END; $$`
    );
    await database.db.execute(
      database.sql`CREATE TRIGGER employee_test_fail_group BEFORE INSERT ON groupmember FOR EACH ROW EXECUTE FUNCTION employee_test_fail_group()`
    );
    try {
      await expect(services.activateEmployee(token, 'Employee-password-2026')).rejects.toThrow();
      const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
      expect(identity.account).toBeNull();
      expect(identity.member?.profileId).toBeNull();
      expect(await services.previewEmployeeActivation(token)).toMatchObject({
        employeeCode: created.employee.employeeCode
      });
    } finally {
      await database.db.execute(database.sql`DROP TRIGGER employee_test_fail_group ON groupmember`);
      await database.db.execute(database.sql`DROP FUNCTION employee_test_fail_group()`);
    }
    await services.activateEmployee(token, 'Employee-password-2026');
    const assigned = await services.getEmployeeDetails(organizationId, administratorId, created.employee.id);
    expect(assigned.enrollments).toHaveLength(1);
    expect(assigned.enrollments[0]).toMatchObject({ kind: 'ASSIGNED', state: 'not_started' });
    const [member] = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, groupId));
    await enrollmentQueries.recordCourseCompletion({
      courseId,
      groupMemberId: member.id,
      profileId: member.profileId!,
      completedAt: new Date().toISOString(),
      recertificationMonths: null
    });
    const completed = await services.getEmployeeDetails(organizationId, administratorId, created.employee.id);
    expect(completed.enrollments[0].state).toBe('completed');
  });

  it('keeps an existing password on activation and follows membership demotion for administrative access', async () => {
    const email = `existing-${organizationId}@example.com`;
    const context = await auth.$context;
    const originalHash = await context.password.hash('Existing-password-2026');
    const profileId = await queries.createEmployeeCredentials(email, 'Existing account', originalHash);
    const created = await draft({ email, sendActivation: true });
    const token = activationToken();
    expect(await services.previewEmployeeActivation(token)).toMatchObject({ hasAccount: true });
    await services.activateEmployee(token);
    const [account] = await database.db
      .select()
      .from(database.account)
      .where(database.eq(database.account.userId, profileId));
    expect(account.password).toBe(originalHash);
    expect(await queries.getEmployeeAccess(organizationId, profileId)).toMatchObject({
      roles: [],
      canManagePeople: false
    });
    const administrator = await activateDraft({ roles: ['ADMIN'] });
    const { fullname, department, jobTitle, managerId } = administrator;
    const startDate = administrator.startDate ?? '';
    await services.editEmployee(organizationId, administratorId, administrator.id, {
      fullname,
      department,
      jobTitle,
      managerId,
      startDate,
      roles: []
    });
    const identity = await queries.findEmployeeAccount(administrator.email, organizationId);
    expect(identity.member?.roleId).toBe(3);
    expect(await queries.getEmployeeAccess(organizationId, administrator.profileId)).toMatchObject({
      roles: [],
      canManagePeople: false,
      canGrantRoles: false
    });
    expect(created.employee.employeeCode).toBeTruthy();
  });

  async function courseFixture() {
    const groupId = randomUUID();
    const courseId = randomUUID();
    await database.db.insert(database.group).values({ id: groupId, name: 'Course enrollment', organizationId });
    await database.db
      .insert(database.course)
      .values({ id: courseId, title: 'Employee training', description: 'Integration course', groupId });
    return { groupId, courseId };
  }

  it('resolves profile links within the organization and the manager direct-report scope', async () => {
    const manager = await activateDraft();
    const report = await activateDraft({ managerId: manager.id });
    const outsider = await activateDraft();
    const query = { search: '', department: '', page: 1, limit: 25, profileId: report.profileId };
    const administratorResult = await services.getEmployees(organizationId, administratorId, query);
    expect(administratorResult.rows.map((staff) => staff.id)).toEqual([report.id]);
    const departmentResult = await services.getEmployees(organizationId, administratorId, {
      ...query,
      department: 'oper'
    });
    expect(departmentResult.rows.map((staff) => staff.id)).toEqual([report.id]);
    const managerResult = await services.getEmployees(organizationId, manager.profileId, query);
    expect(managerResult.rows.map((staff) => staff.id)).toEqual([report.id]);
    const forbiddenResult = await services.getEmployees(organizationId, manager.profileId, {
      ...query,
      profileId: outsider.profileId
    });
    expect(forbiddenResult.rows).toEqual([]);
    expect(forbiddenResult.total).toBe(0);
    const missingResult = await services.getEmployees(organizationId, administratorId, {
      ...query,
      profileId: randomUUID()
    });
    expect(missingResult.rows).toEqual([]);
  });

  it('reads the current account avatar in the directory and details while retaining employees without accounts', async () => {
    const pending = await draft();
    const query = { search: pending.employee.employeeCode, department: '', page: 1, limit: 25 };
    const pendingResult = await services.getEmployees(organizationId, administratorId, query);
    expect(pendingResult.total).toBe(1);
    expect(pendingResult.rows[0]).toMatchObject({ id: pending.employee.id, avatarUrl: null });
    const staff = await activateDraft();
    const avatarUrl = '/images/avatars/employee-avatar.svg';
    await database.db
      .update(database.profile)
      .set({ avatarUrl })
      .where(database.eq(database.profile.id, staff.profileId));
    const staffQuery = { ...query, search: staff.employeeCode };
    const roster = await services.getEmployees(organizationId, administratorId, staffQuery);
    expect(roster.rows[0].avatarUrl).toBe(avatarUrl);
    const details = await services.getEmployeeDetails(organizationId, administratorId, staff.id);
    expect(details.employee.avatarUrl).toBe(avatarUrl);
    await database.db
      .update(database.profile)
      .set({ avatarUrl: null })
      .where(database.eq(database.profile.id, staff.profileId));
    const updatedDetails = await services.getEmployeeDetails(organizationId, administratorId, staff.id);
    expect(updatedDetails.employee.avatarUrl).toBeNull();
  });

  it('preserves enrollment, progress and certificate filters from retired audience links', async () => {
    const fixture = await courseFixture();
    const lessonId = randomUUID();
    await database.db.insert(database.lesson).values({
      id: lessonId,
      courseId: fixture.courseId,
      title: 'Onboarding lesson',
      slug: 'onboarding-lesson',
      order: 1
    });
    const assigned = await activateDraft({}, [fixture.courseId]);
    const unassigned = await draft();
    const query = { search: '', department: '', page: 1, limit: 25, profileId: assigned.profileId };
    const notStarted = await services.getEmployees(organizationId, administratorId, {
      ...query,
      completion: 'not_started'
    });
    expect(notStarted.rows.map((staff) => staff.id)).toEqual([assigned.id]);
    const notEnrolled = await services.getEmployees(organizationId, administratorId, {
      ...query,
      enrollment: 'not_enrolled'
    });
    expect(notEnrolled.rows).toEqual([]);
    const drafts = await services.getEmployees(organizationId, administratorId, {
      ...query,
      profileId: undefined,
      search: unassigned.employee.employeeCode,
      enrollment: 'not_enrolled'
    });
    expect(drafts.rows.map((staff) => staff.id)).toEqual([unassigned.employee.id]);
    await database.db
      .insert(database.lessonCompletion)
      .values({ lessonId, profileId: assigned.profileId, isComplete: true });
    const finished = await services.getEmployees(organizationId, administratorId, {
      ...query,
      completion: 'completed'
    });
    expect(finished.rows.map((staff) => staff.id)).toEqual([assigned.id]);
    const started = await services.getEmployees(organizationId, administratorId, {
      ...query,
      completion: 'not_started'
    });
    expect(started.rows).toEqual([]);
    const noCertificate = await services.getEmployees(organizationId, administratorId, {
      ...query,
      certificate: 'earned'
    });
    expect(noCertificate.rows).toEqual([]);
    const certificateEarnedAt = new Date().toISOString();
    await database.db
      .update(database.groupmember)
      .set({ certificateEarnedAt })
      .where(
        database.and(
          database.eq(database.groupmember.groupId, fixture.groupId),
          database.eq(database.groupmember.profileId, assigned.profileId)
        )
      );
    const certified = await services.getEmployees(organizationId, administratorId, { ...query, certificate: 'earned' });
    expect(certified.rows.map((staff) => staff.id)).toEqual([assigned.id]);
  });

  it('uses the saved activation template and enforced language for actual delivery', async () => {
    await database.db.execute(
      database.sql`update organization set settings = '{"language":{"enforced":true,"locale":"vi"}}'::jsonb where id = ${organizationId}`
    );
    await queries.upsertOrganizationStudentEmailTemplate({
      organizationId,
      emailId: 'employeeActivation',
      locale: 'vi',
      content: '<p>Chào {{employee_name}}: {{employee_code}}</p>',
      subject: 'Kích hoạt {{employee_code}}'
    });
    const created = await draft({ sendActivation: true });
    const config = vi.mocked(mail.sendEmail).mock.calls.at(-1)!;
    expect(config[0]).toBe('employeeActivation');
    expect(config[1]).toMatchObject({
      locale: 'vi',
      contentOverride: '<p>Chào {{employee_name}}: {{employee_code}}</p>',
      subjectOverride: 'Kích hoạt {{employee_code}}',
      fields: { employeeCode: created.employee.employeeCode, employeeName: created.employee.fullname }
    });
    expect(await services.previewEmployeeActivation(activationToken())).toMatchObject({
      employeeCode: created.employee.employeeCode
    });
  });

  it('enrolls only existing active employees and searches by employee code', async () => {
    const courses = await import('@api/services/course/employees');
    const jobs = await import('@api/services/jobs');
    const fixture = await courseFixture();
    const staff = await activateDraft();
    const available = await courses.listAvailableCourseEmployees(fixture.courseId, staff.employeeCode);
    expect(available.map((row) => row.profileId)).toEqual([staff.profileId]);
    vi.mocked(jobs.enqueueTransactionalEmail).mockClear();
    const members = [{ profileId: staff.profileId, roleId: 3 as const, email: 'forged@example.com' }];
    const added = await courses.enrollExistingCourseEmployees(fixture.courseId, administratorId, members);
    expect(added).toHaveLength(1);
    expect(added[0].email).toBe(staff.email);
    expect(jobs.enqueueTransactionalEmail).toHaveBeenCalledWith(
      'studentCourseWelcome',
      expect.objectContaining({ to: staff.email, fields: expect.objectContaining({ courseName: 'Employee training' }) })
    );
    expect(
      (await courses.listAvailableCourseEmployees(fixture.courseId, staff.employeeCode)).map(
        (employee) => employee.profileId
      )
    ).toEqual([staff.profileId]);
    expect(await courses.enrollExistingCourseEmployees(fixture.courseId, administratorId, members, false)).toEqual([]);
    expect(jobs.enqueueTransactionalEmail).toHaveBeenCalledTimes(1);
    const [row] = await enrollmentQueries.listCourseEnrollments(fixture.courseId);
    expect(row).toMatchObject({ employeeId: staff.id, kind: 'ASSIGNED' });
    const { deleteCourseMember } = await import('@cio/db/queries/course/people');
    expect(await deleteCourseMember(fixture.courseId, added[0].id)).toBeNull();
    await enrollment.revokeEnrollment(fixture.courseId, row.id, administratorId);
    expect(await enrollmentQueries.listEmployeeEnrollments(staff.id)).toEqual([]);
  });

  it('rejects unknown, unmanaged and suspended accounts before writing any member of a batch', async () => {
    const courses = await import('@api/services/course/employees');
    const fixture = await courseFixture();
    const staff = await activateDraft();
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [{ roleId: 3, email: 'new-person@example.com' }],
        false
      )
    ).rejects.toThrow('Select existing employees');
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [
          { profileId: staff.profileId, roleId: 3 },
          { profileId: administratorId, roleId: 3 }
        ],
        false
      )
    ).rejects.toThrow('Only active employees');
    expect(
      (await courses.listAvailableCourseEmployees(fixture.courseId, staff.employeeCode)).map((row) => row.profileId)
    ).toEqual([staff.profileId]);
    await database.db.insert(database.organizationmember).values({
      organizationId: otherOrgId,
      profileId: administratorId,
      email: `${administratorId}@example.com`,
      roleId: 1,
      verified: true
    });
    const foreign = await services.createEmployee(otherOrgId, administratorId, {
      employeeCode: `FOREIGN-${organizationId.slice(0, 6)}`,
      fullname: 'Foreign Employee',
      email: `foreign-${organizationId}@example.com`,
      roles: [],
      department: '',
      jobTitle: '',
      managerId: null,
      startDate: '',
      sendActivation: true
    });
    await services.activateEmployee(activationToken(), 'Employee-password-2026');
    const foreignIdentity = await queries.findEmployeeAccount(foreign.employee.email, otherOrgId);
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [{ profileId: foreignIdentity.member!.profileId!, roleId: 3 }],
        false
      )
    ).rejects.toThrow('Only active employees');
    await services.setEmployeeStatus(organizationId, administratorId, staff.id, 'SUSPENDED', 'Integration suspension');
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [{ profileId: staff.profileId, roleId: 3 }],
        false
      )
    ).rejects.toThrow('Only active employees');
    expect(
      (await courses.listAvailableCourseEmployees(fixture.courseId, staff.employeeCode)).map(
        (employee) => employee.profileId
      )
    ).toEqual([]);
    const [count] = await database.db.execute(
      database.sql`select count(*)::int as total from groupmember where group_id = ${fixture.groupId}`
    );
    expect(count.total).toBe(0);
  });

  it('combines the rights of every role one person holds', async () => {
    const fixture = await courseFixture();
    const groups = await import('@cio/db/queries/group');
    const trainer = await activateDraft({ roles: ['LND'] });
    const trainerAndPeople = await activateDraft({ roles: ['LND', 'HR'] });

    const trainerAccess = await queries.getEmployeeAccess(organizationId, trainer.profileId);
    const combinedAccess = await queries.getEmployeeAccess(organizationId, trainerAndPeople.profileId);

    expect(trainerAccess).toMatchObject({
      roles: ['LND'],
      canManageCourses: true,
      canAssignTraining: true,
      canViewOrgReports: true,
      canManagePeople: false
    });
    expect(combinedAccess).toMatchObject({
      roles: ['LND', 'HR'],
      canManageCourses: true,
      canManagePeople: true,
      canGrantRoles: false
    });
    expect(await groups.isCourseTeamMemberOrOrgAdmin(fixture.courseId, trainer.profileId)).toBe(true);
    await expect(
      services.createEmployee(organizationId, trainerAndPeople.profileId, {
        employeeCode: `GRANT-${organizationId.slice(0, 6)}`,
        email: `grant-${organizationId}@example.com`,
        fullname: 'Granted Role',
        roles: ['LND'],
        department: '',
        jobTitle: '',
        managerId: null,
        startDate: '',
        sendActivation: false
      })
    ).rejects.toThrow('employees.errors.forbidden');
  });

  it('keeps course team membership to administrators and L&D', async () => {
    const courses = await import('@api/services/course/employees');
    const fixture = await courseFixture();
    const tutor = await activateDraft({ roles: ['LND'] });
    const secondTutor = await activateDraft({ roles: ['LND'] });
    const humanResources = await activateDraft({ roles: ['HR'] });
    const learner = await activateDraft();
    await courses.enrollExistingCourseEmployees(
      fixture.courseId,
      administratorId,
      [{ profileId: tutor.profileId, roleId: 2 }],
      false
    );
    await courses.enrollExistingCourseEmployees(
      fixture.courseId,
      tutor.profileId,
      [{ profileId: secondTutor.profileId, roleId: 2 }],
      false
    );
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [{ profileId: humanResources.profileId, roleId: 2 }],
        false
      )
    ).rejects.toThrow('instructor role');
    await expect(
      courses.enrollExistingCourseEmployees(
        fixture.courseId,
        administratorId,
        [{ profileId: learner.profileId, roleId: 2 }],
        false
      )
    ).rejects.toThrow('instructor role');
    const added = await courses.enrollExistingCourseEmployees(
      fixture.courseId,
      tutor.profileId,
      [{ profileId: learner.profileId, roleId: 3 }],
      false
    );
    expect(added[0].profileId).toBe(learner.profileId);
  });

  it('rejects old course share links at creation, preview and acceptance', async () => {
    const fixture = await courseFixture();
    const links = await import('@api/services/invite-link/invite-link');
    const { createInviteLink } = await import('@cio/db/queries/invite-link');
    const { generateInviteToken, hashInviteToken } = await import('@api/utils/invite-token');
    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    await createInviteLink({
      organizationId,
      courseId: fixture.courseId,
      resourceType: 'COURSE',
      roleId: 3,
      token,
      tokenHash,
      createdByProfileId: administratorId
    });
    await expect(
      links.getOrCreateInviteLink({
        organizationId,
        target: { resourceType: 'COURSE', resourceId: fixture.courseId },
        createdByProfileId: administratorId
      })
    ).rejects.toThrow('Add existing employees');
    await expect(links.previewInviteLink(token)).rejects.toThrow('Add existing employees');
    await expect(
      links.acceptInviteLink(token, { id: administratorId, email: `${administratorId}@example.com` })
    ).rejects.toThrow('Add existing employees');
    const [count] = await database.db.execute(
      database.sql`select count(*)::int as total from groupmember where group_id = ${fixture.groupId}`
    );
    expect(count.total).toBe(0);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });
});
