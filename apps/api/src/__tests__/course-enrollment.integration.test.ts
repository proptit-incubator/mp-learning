import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ORGANIZATION_SCOPE = { kind: 'organization' } as const;

const mocks = vi.hoisted(() => ({ email: vi.fn(), emit: vi.fn() }));
vi.mock('@api/services/jobs', () => ({ enqueueTransactionalEmail: mocks.email }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: vi.fn() }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  buildMemberSource: (method: string) => ({ method }),
  emitCourseMemberAddedWebhookEvent: mocks.emit,
  emitCourseWebhookEvent: vi.fn()
}));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: vi.fn() }));

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('course enrollment on isolated PostgreSQL', () => {
  let database: typeof import('@cio/db/drizzle');
  let service: typeof import('@api/services/course/enrollment');
  let enrollment: typeof import('@cio/db/queries/course/enrollment');
  let courseQueries: typeof import('@cio/db/queries/course');
  let employeeQueries: typeof import('@cio/db/queries/organization');
  let analytics: typeof import('@cio/db/queries/dash/learning-analytics');
  let organizationId: string;
  let learnerId: string;
  let actorId: string;
  let employeeId: string;
  let email: string;

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('An isolated test database is required');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected database');

    service = await import('@api/services/course/enrollment');
    enrollment = await import('@cio/db/queries/course/enrollment');
    courseQueries = await import('@cio/db/queries/course');
    employeeQueries = await import('@cio/db/queries/organization');
    analytics = await import('@cio/db/queries/dash/learning-analytics');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
  }, 30000);

  async function createProfile(profileId: string) {
    const userEmail = `${profileId}@example.com`;
    await database.db
      .insert(database.user)
      .values({ id: profileId, name: profileId, email: userEmail, emailVerified: true });
    await database.db
      .insert(database.profile)
      .values({ id: profileId, username: profileId, fullname: profileId, email: userEmail });
  }

  async function createEmployee(
    profileId: string | null,
    overrides: Partial<typeof database.employee.$inferInsert> = {}
  ) {
    const employeeEmail = `${randomUUID()}@example.com`;
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({
        organizationId,
        profileId,
        email: employeeEmail,
        roleId: 3,
        status: profileId ? 'ACTIVE' : 'DEACTIVATED'
      })
      .returning();
    const [row] = await database.db
      .insert(database.employee)
      .values({
        organizationId,
        memberId: member.id,
        fullname: 'Learner',
        email: employeeEmail,
        employeeCode: randomUUID().slice(0, 12).toUpperCase(),
        department: 'Sales',
        jobTitle: 'Rep',
        status: profileId ? 'ACTIVE' : 'DRAFT',
        activatedAt: profileId ? new Date().toISOString() : null,
        ...overrides
      })
      .returning();
    return { employee: row, member, email: employeeEmail };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.email.mockResolvedValue({ jobIds: ['job'] });
    organizationId = randomUUID();
    learnerId = randomUUID();
    actorId = randomUUID();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Enrollment tests' });
    await createProfile(actorId);
    await createProfile(learnerId);
    await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: actorId, roleId: 1, status: 'ACTIVE' });
    const learner = await createEmployee(learnerId);
    employeeId = learner.employee.id;
    email = learner.email;
  });

  async function createCourse(overrides: Partial<typeof database.course.$inferInsert> = {}) {
    const [group] = await database.db.insert(database.group).values({ organizationId, name: 'Group' }).returning();
    const [course] = await database.db
      .insert(database.course)
      .values({
        title: 'Training',
        description: 'Training',
        groupId: group.id,
        isPublished: true,
        metadata: { allowSelfEnrollment: true },
        ...overrides
      })
      .returning();
    await database.db
      .insert(database.lesson)
      .values({ courseId: course.id, title: 'Lesson', slug: 'lesson', order: 1 });
    return course;
  }

  async function hasAccess(courseId: string, profileId = learnerId) {
    const [row] = await database.db.execute<{ allowed: boolean }>(
      database.sql`select ${enrollment.learnerAccessSql(courseId, profileId)} as allowed`
    );
    return row.allowed;
  }

  async function stateOf(enrollmentId: string) {
    const [row] = await database.db.execute<{ state: string }>(
      database.sql`select ${enrollment.enrollmentStateSql('ce')} as state from course_enrollment ce where ce.id = ${enrollmentId}`
    );
    return row.state;
  }

  it('self-enrolls an active employee and reports a self-paced course', async () => {
    const course = await createCourse();
    const result = await service.selfEnroll(organizationId, course.id, { id: learnerId, email });
    expect(result.alreadyJoined).toBe(false);
    expect(await hasAccess(course.id)).toBe(true);

    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning).toHaveLength(1);
    expect(learning[0].enrollment).toMatchObject({ kind: 'SELF', state: 'not_started', dueDate: null });
    expect((await service.selfEnroll(organizationId, course.id, { id: learnerId, email })).alreadyJoined).toBe(true);
  });

  it('assigns courses by department, keeps existing rows on repeat and prefers the assignment for the learner', async () => {
    const course = await createCourse();
    await service.selfEnroll(organizationId, course.id, { id: learnerId, email });
    const input = {
      courseIds: [course.id],
      filter: { departments: ['Sales'] },
      dueDate: '2030-01-01T00:00:00.000Z',
      batchLabel: 'Onboarding 11/2026',
      message: 'Welcome',
      sendEmail: true
    };
    expect(await service.assignCourses(organizationId, actorId, input)).toEqual({ assigned: 1, existing: 0 });
    expect(await service.assignCourses(organizationId, actorId, input)).toEqual({ assigned: 0, existing: 1 });
    expect(mocks.email).toHaveBeenCalledTimes(2);

    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0].enrollment).toMatchObject({
      kind: 'ASSIGNED',
      batchLabel: 'Onboarding 11/2026',
      dueDate: '2030-01-01T00:00:00.000Z'
    });
  });

  it('assigns a draft employee and materializes the course membership on activation', async () => {
    const course = await createCourse({ isPublished: false });
    const draft = await createEmployee(null);
    await service.assignCourses(organizationId, actorId, {
      courseIds: [course.id],
      employeeIds: [draft.employee.id],
      message: '',
      sendEmail: false
    });
    const rows = await enrollment.listEmployeeEnrollments(draft.employee.id);
    expect(rows).toHaveLength(1);

    const profileId = randomUUID();
    await createProfile(profileId);
    await database.db
      .update(database.organizationmember)
      .set({ profileId, status: 'ACTIVE' })
      .where(database.eq(database.organizationmember.id, draft.member.id));
    await database.db
      .update(database.employee)
      .set({ status: 'ACTIVE', activatedAt: new Date().toISOString() })
      .where(database.eq(database.employee.id, draft.employee.id));
    await employeeQueries.enrollEmployee(draft.employee.id);
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.profileId, profileId));
    expect(members).toHaveLength(1);
    expect(await hasAccess(course.id, profileId)).toBe(true);
  });

  it('computes overdue, waived, completed and expired states', async () => {
    const course = await createCourse({ recertificationMonths: 12 });
    await service.assignCourses(organizationId, actorId, {
      courseIds: [course.id],
      employeeIds: [employeeId],
      dueDate: '2020-01-01T00:00:00.000Z',
      message: '',
      sendEmail: false
    });
    const [row] = await enrollment.listCourseEnrollments(course.id);
    expect(row.state).toBe('overdue');

    await service.waiveEnrollment(course.id, row.id, actorId, { reason: 'Certified elsewhere' });
    expect(await stateOf(row.id)).toBe('waived');
    await database.db
      .update(database.courseEnrollment)
      .set({ status: 'ACTIVE', dueDate: '2030-01-01T00:00:00.000Z' })
      .where(database.eq(database.courseEnrollment.id, row.id));

    const [member] = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.profileId, learnerId));
    const completedAt = new Date().toISOString();
    const cycle = {
      courseId: course.id,
      groupMemberId: member.id,
      profileId: learnerId,
      completedAt,
      recertificationMonths: 12
    };
    expect(await enrollment.recordCourseCompletion(cycle)).not.toBeNull();
    expect(await enrollment.recordCourseCompletion(cycle)).toBeNull();
    expect(await stateOf(row.id)).toBe('completed');

    await database.db
      .update(database.courseCompletionRecord)
      .set({ validUntil: '2020-06-01T00:00:00.000Z' })
      .where(database.eq(database.courseCompletionRecord.profileId, learnerId));
    expect(await stateOf(row.id)).toBe('expired');
    await enrollment.updateEnrollmentDueDate(row.id, '2031-01-01T00:00:00.000Z');
    const expired = await enrollment.listEnrollmentsToReopen();
    expect(expired.map((item) => item.enrollmentId)).toContain(row.id);
  });

  describe('recertification cycles', () => {
    async function completeExpiredCycle(courseId: string) {
      const [member] = await database.db
        .select()
        .from(database.groupmember)
        .where(database.eq(database.groupmember.profileId, learnerId));
      const [lesson] = await database.db
        .select()
        .from(database.lesson)
        .where(database.eq(database.lesson.courseId, courseId));
      const [exercise] = await database.db
        .insert(database.exercise)
        .values({ courseId, title: 'Final quiz', slug: randomUUID(), order: 2 })
        .returning();
      await database.db
        .insert(database.lessonCompletion)
        .values({ lessonId: lesson.id, profileId: learnerId, isComplete: true });
      await database.db
        .insert(database.submission)
        .values({ exerciseId: exercise.id, submittedBy: member.id, courseId, total: 8 });
      const cycle = {
        courseId,
        groupMemberId: member.id,
        profileId: learnerId,
        completedAt: '2024-01-01T00:00:00.000Z',
        recertificationMonths: 12
      };
      expect(await enrollment.recordCourseCompletion(cycle)).not.toBeNull();
      await database.db
        .update(database.groupmember)
        .set({ completedAt: cycle.completedAt })
        .where(database.eq(database.groupmember.id, member.id));
      return { member, cycle };
    }

    it('reopens an expired cycle without losing its history and lets the learner earn the next one', async () => {
      const course = await createCourse({ recertificationMonths: 12 });
      await service.assignCourses(organizationId, actorId, {
        courseIds: [course.id],
        employeeIds: [employeeId],
        message: '',
        sendEmail: false
      });
      const { member, cycle } = await completeExpiredCycle(course.id);
      const { reopenExpiredCompletionCycle } = await import('@cio/db/queries/course/reset-progress');

      const renewedWithStaleProgress = await enrollment.recordCourseCompletion({
        ...cycle,
        completedAt: new Date().toISOString()
      });
      const toReopen = await enrollment.listEnrollmentsToReopen();
      const reopenedCycle = await database.db.transaction((tx) =>
        reopenExpiredCompletionCycle(tx, { courseId: course.id, groupMemberId: member.id, profileId: learnerId })
      );
      const reopenedTwice = await database.db.transaction((tx) =>
        reopenExpiredCompletionCycle(tx, { courseId: course.id, groupMemberId: member.id, profileId: learnerId })
      );

      expect(renewedWithStaleProgress).toBeNull();
      expect(toReopen.filter((row) => row.courseId === course.id)).toEqual([
        expect.objectContaining({ kind: 'ASSIGNED', groupMemberId: member.id })
      ]);
      expect(reopenedCycle).toBe(1);
      expect(reopenedTwice).toBeNull();

      const history = await database.db
        .select()
        .from(database.courseCompletionRecord)
        .where(database.eq(database.courseCompletionRecord.courseId, course.id));
      const [archive] = await database.db
        .select()
        .from(database.courseCycleArchive)
        .where(database.eq(database.courseCycleArchive.courseId, course.id));
      const submissions = await database.db
        .select()
        .from(database.submission)
        .where(database.eq(database.submission.submittedBy, member.id));
      const lessonProgress = await database.db
        .select()
        .from(database.lessonCompletion)
        .where(database.eq(database.lessonCompletion.profileId, learnerId));
      const [memberAfter] = await database.db
        .select()
        .from(database.groupmember)
        .where(database.eq(database.groupmember.id, member.id));

      expect(history).toEqual([expect.objectContaining({ cycleNumber: 1, reopenedAt: expect.any(String) })]);
      expect(archive).toMatchObject({ cycleNumber: 1, profileId: learnerId });
      expect(archive.submissions).toEqual([expect.objectContaining({ total: 8, answers: [] })]);
      expect(submissions).toEqual([]);
      expect(lessonProgress).toEqual([]);
      expect(memberAfter.completedAt).toBeNull();
      expect((await enrollment.listEnrollmentsToReopen()).some((row) => row.courseId === course.id)).toBe(false);

      const nextCycle = await enrollment.recordCourseCompletion({ ...cycle, completedAt: new Date().toISOString() });
      expect(nextCycle).toMatchObject({ cycle_number: 2 });
    });

    it('issues one verifiable certificate per completion cycle', async () => {
      const certificates = await import('@api/services/course/certificate');
      const course = await createCourse({ recertificationMonths: 12 });
      await service.assignCourses(organizationId, actorId, {
        courseIds: [course.id],
        employeeIds: [employeeId],
        message: '',
        sendEmail: false
      });
      const { member, cycle } = await completeExpiredCycle(course.id);

      const expiredIssue = await certificates.issueCourseCertificate(course.id, learnerId, cycle.completedAt);
      const repeatedIssue = await certificates.issueCourseCertificate(course.id, learnerId, new Date().toISOString());
      const expiredCheck = await certificates.verifyCertificate(expiredIssue!.code.toLowerCase());

      const { reopenExpiredCompletionCycle } = await import('@cio/db/queries/course/reset-progress');
      await database.db.transaction((tx) =>
        reopenExpiredCompletionCycle(tx, { courseId: course.id, groupMemberId: member.id, profileId: learnerId })
      );
      await enrollment.recordCourseCompletion({ ...cycle, completedAt: new Date().toISOString() });
      const renewedIssue = await certificates.issueCourseCertificate(course.id, learnerId, new Date().toISOString());
      const renewedCheck = await certificates.verifyCertificate(renewedIssue!.code);
      const stillStored = await certificates.verifyCertificate(expiredIssue!.code);

      expect(repeatedIssue?.code).toBe(expiredIssue?.code);
      expect(expiredCheck).toMatchObject({ state: 'expired', recipientName: 'Learner', courseTitle: course.title });
      expect(renewedIssue).toMatchObject({ cycleNumber: 2 });
      expect(renewedIssue?.code).not.toBe(expiredIssue?.code);
      expect(renewedCheck.state).toBe('valid');
      expect(stillStored.state).toBe('expired');
    });

    it('also reopens expired completions of self-enrolled learners', async () => {
      const course = await createCourse({ recertificationMonths: 12 });
      await service.selfEnroll(organizationId, course.id, { id: learnerId, email });
      await completeExpiredCycle(course.id);

      const toReopen = await enrollment.listEnrollmentsToReopen();

      expect(toReopen.filter((row) => row.courseId === course.id)).toEqual([expect.objectContaining({ kind: 'SELF' })]);
    });
  });

  it('revokes access without deleting the membership and counts assignments in analytics', async () => {
    const course = await createCourse();
    await service.assignCourses(organizationId, actorId, {
      courseIds: [course.id],
      employeeIds: [employeeId],
      batchLabel: 'Q4',
      message: '',
      sendEmail: false
    });
    const snapshot = await analytics.getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE);
    expect(snapshot).toMatchObject({ assignments: 1, not_started: 1, enrolledEmployees: 1 });
    expect(snapshot.batches).toEqual([expect.objectContaining({ batchLabel: 'Q4', assigned: 1 })]);

    const [row] = await enrollment.listCourseEnrollments(course.id);
    await service.revokeEnrollment(course.id, row.id, actorId);
    expect(await hasAccess(course.id)).toBe(false);
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.profileId, learnerId));
    expect(members).toHaveLength(1);
  });

  describe('training roles', () => {
    async function createStaff(roles: Array<'ADMIN' | 'LND' | 'HR'>) {
      const profileId = randomUUID();
      await createProfile(profileId);
      const staff = await createEmployee(profileId, { roles });
      return { profileId, employeeId: staff.employee.id };
    }

    async function createLearner(overrides: Partial<typeof database.employee.$inferInsert> = {}) {
      const profileId = randomUUID();
      await createProfile(profileId);
      return createEmployee(profileId, overrides);
    }

    it('lets HR assign courses and manage the assignment without joining the course team', async () => {
      const course = await createCourse();
      const hr = await createStaff(['HR']);

      const result = await service.assignCourses(organizationId, hr.profileId, {
        courseIds: [course.id],
        employeeIds: [employeeId],
        message: '',
        sendEmail: false
      });
      const [row] = await enrollment.listCourseEnrollments(course.id);
      const updated = await service.changeEnrollmentDueDate(
        course.id,
        row.id,
        hr.profileId,
        '2031-01-01T00:00:00.000Z'
      );

      expect(result.assigned).toBe(1);
      expect(updated).toBeTruthy();
    });

    it('keeps managers and plain employees from assigning or managing assignments', async () => {
      const course = await createCourse();
      const manager = await createStaff([]);
      await service.assignCourses(organizationId, actorId, {
        courseIds: [course.id],
        employeeIds: [employeeId],
        message: '',
        sendEmail: false
      });
      const [row] = await enrollment.listCourseEnrollments(course.id);
      const input = { courseIds: [course.id], employeeIds: [employeeId], message: '', sendEmail: false };

      await expect(service.assignCourses(organizationId, manager.profileId, input)).rejects.toMatchObject({
        statusCode: 403
      });
      await expect(service.revokeEnrollment(course.id, row.id, learnerId)).rejects.toMatchObject({ statusCode: 403 });
    });

    it('limits a manager report to their whole reporting line', async () => {
      const course = await createCourse();
      const manager = await createStaff([]);
      const lead = await createLearner({ managerId: manager.employeeId });
      const outsider = await createLearner();
      await database.db
        .update(database.employee)
        .set({ managerId: lead.employee.id })
        .where(database.eq(database.employee.id, employeeId));
      await service.assignCourses(organizationId, actorId, {
        courseIds: [course.id],
        employeeIds: [employeeId, outsider.employee.id],
        message: '',
        sendEmail: false
      });

      const snapshot = await analytics.getLearningAnalyticsSnapshot(organizationId, {
        kind: 'reports',
        managerEmployeeId: manager.employeeId
      });
      const reportedEmployees = snapshot.rows.map((row) => row.employeeId);

      expect(snapshot.employees).toBe(2);
      expect(reportedEmployees).toEqual([employeeId]);
    });

    it('limits a tutor report to the courses they teach and their learners', async () => {
      const taught = await createCourse({ title: 'Taught' });
      const other = await createCourse({ title: 'Other' });
      const outsider = await createLearner();
      const tutorId = randomUUID();
      await createProfile(tutorId);
      await database.db
        .insert(database.groupmember)
        .values({ groupId: taught.groupId!, profileId: tutorId, roleId: 2 });
      await service.assignCourses(organizationId, actorId, {
        courseIds: [taught.id],
        employeeIds: [employeeId],
        message: '',
        sendEmail: false
      });
      await service.assignCourses(organizationId, actorId, {
        courseIds: [other.id],
        employeeIds: [outsider.employee.id],
        message: '',
        sendEmail: false
      });

      const snapshot = await analytics.getLearningAnalyticsSnapshot(organizationId, {
        kind: 'courses',
        teamProfileId: tutorId
      });

      expect(snapshot.courses.map((course) => course.id)).toEqual([taught.id]);
      expect(snapshot.employees).toBe(1);
      expect(snapshot.rows.map((row) => row.employeeId)).toEqual([employeeId]);
    });
  });
});
