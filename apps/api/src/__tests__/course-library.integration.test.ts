import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ email: vi.fn() }));
vi.mock('@api/services/jobs', () => ({ enqueueTransactionalEmail: mocks.email }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: vi.fn() }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  buildMemberSource: (method: string) => ({ method }),
  emitCourseMemberAddedWebhookEvent: vi.fn(),
  emitCourseWebhookEvent: vi.fn()
}));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: vi.fn() }));

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('course library on isolated PostgreSQL', () => {
  let database: typeof import('@cio/db/drizzle');
  let queries: typeof import('@cio/db/queries/course');
  let services: typeof import('@api/services/course/library');
  let enrollment: typeof import('@api/services/course/enrollment');
  let organizationId: string;
  let profileId: string;
  let actorId: string;
  let employeeId: string;
  let memberId: number;
  let userEmail: string;

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('Library tests require a database ending in _test');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected library test database');

    queries = await import('@cio/db/queries/course');
    services = await import('@api/services/course/library');
    enrollment = await import('@api/services/course/enrollment');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
  }, 30000);

  async function createProfile(id: string) {
    const email = `${id}@example.com`;
    await database.db.insert(database.user).values({ id, name: 'Learner', email, emailVerified: true });
    await database.db.insert(database.profile).values({ id, fullname: 'Learner', email, username: id });
    return email;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.email.mockResolvedValue({ jobIds: ['job'] });
    organizationId = randomUUID();
    profileId = randomUUID();
    actorId = randomUUID();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Library tests' });
    userEmail = await createProfile(profileId);
    await createProfile(actorId);
    await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: actorId, roleId: 1, status: 'ACTIVE', verified: true });
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId, email: userEmail, roleId: 3, verified: true })
      .returning();
    memberId = member.id;
    const [employee] = await database.db
      .insert(database.employee)
      .values({
        organizationId,
        memberId,
        employeeCode: profileId.toUpperCase(),
        fullname: 'Learner',
        email: userEmail,
        status: 'ACTIVE',
        activatedAt: new Date().toISOString()
      })
      .returning();
    employeeId = employee.id;
  });

  async function createCourse(overrides: Partial<typeof database.course.$inferInsert> = {}) {
    const [group] = await database.db
      .insert(database.group)
      .values({ organizationId, name: 'Library group' })
      .returning();
    const values = {
      title: 'Library course',
      description: 'Course introduction',
      groupId: group.id,
      isPublished: true,
      metadata: { allowSelfEnrollment: true },
      ...overrides
    };
    const [course] = await database.db.insert(database.course).values(values).returning();
    return course;
  }

  async function enrollmentRows(courseId: string) {
    return database.db
      .select()
      .from(database.courseEnrollment)
      .where(database.eq(database.courseEnrollment.courseId, courseId));
  }

  function learner() {
    return { id: profileId, email: userEmail };
  }

  it('preserves legacy visibility while excluding drafts, templates, closed and foreign courses', async () => {
    const legacy = await createCourse({ metadata: {} });
    const legacyClosed = await createCourse({ metadata: { allowNewStudent: false } });
    const assignedOnly = await createCourse({ metadata: { allowSelfEnrollment: false } });
    await createCourse({ isPublished: false });
    await createCourse({ isTemplate: true });
    await createCourse({ status: 'DELETED' });
    const open = await createCourse();
    const foreignOrganizationId = randomUUID();
    await database.db.insert(database.organization).values({ id: foreignOrganizationId, name: 'Foreign' });
    const [foreignGroup] = await database.db
      .insert(database.group)
      .values({ organizationId: foreignOrganizationId, name: 'Foreign group' })
      .returning();
    await database.db.insert(database.course).values({
      title: 'Foreign course',
      description: 'Foreign',
      groupId: foreignGroup.id,
      isPublished: true,
      metadata: { allowSelfEnrollment: true }
    });
    const result = await services.listCourseLibrary(organizationId, profileId);
    expect(result.total).toBe(2);
    expect(result.data.map((course) => course.id).sort()).toEqual([legacy.id, open.id].sort());
    expect(result.data.find((course) => course.id === assignedOnly.id)).toBeUndefined();
    expect(result.data.every((course) => course.canSelfEnroll && !course.hasAccess)).toBe(true);
    await expect(services.getCourseLibraryDetails(organizationId, profileId, legacyClosed.id)).rejects.toMatchObject({
      statusCode: 404
    });
    expect(result.data[0]).not.toHaveProperty('metadata');
    expect(result.data[0]).not.toHaveProperty('cost');
    expect(result.data[0]).not.toHaveProperty('groupId');
    expect(result.data[0]).not.toHaveProperty('type');
  });

  it('keeps self-enrolled courses in the library, in my learning, and out of recommendations', async () => {
    const course = await createCourse();
    const joined = await enrollment.selfEnroll(organizationId, course.id, learner());
    expect(joined.alreadyJoined).toBe(false);
    const details = await services.getCourseLibraryDetails(organizationId, profileId, course.id);
    expect(details).toMatchObject({ isEnrolled: true, hasAccess: true, canSelfEnroll: false });
    const learning = await queries.getEnrolledCourses({ orgId: organizationId, profileId });
    expect(learning.find((entry) => entry.id === course.id)?.enrollment).toMatchObject({ kind: 'SELF' });
    const recommended = await services.listCourseLibrary(organizationId, profileId, {}, true);
    expect(recommended.total).toBe(0);
    await database.db
      .update(database.course)
      .set({ metadata: { allowSelfEnrollment: false } })
      .where(database.eq(database.course.id, course.id));
    expect((await services.getCourseLibraryDetails(organizationId, profileId, course.id)).hasAccess).toBe(true);
  });

  it('shows an assigned closed course only to its learner and drops it once the enrollment is revoked', async () => {
    const course = await createCourse({ metadata: { allowSelfEnrollment: false } });
    expect((await services.listCourseLibrary(organizationId, profileId)).total).toBe(0);
    await enrollment.assignCourses(organizationId, actorId, {
      courseIds: [course.id],
      employeeIds: [employeeId],
      message: '',
      sendEmail: false
    });
    const details = await services.getCourseLibraryDetails(organizationId, profileId, course.id);
    expect(details).toMatchObject({ isEnrolled: true, hasAccess: true, canSelfEnroll: false });
    expect((await enrollment.selfEnroll(organizationId, course.id, learner())).alreadyJoined).toBe(true);
    expect(await enrollmentRows(course.id)).toHaveLength(1);
    expect((await queries.getEnrolledCourses({ orgId: organizationId, profileId })).map((entry) => entry.id)).toContain(
      course.id
    );

    const [row] = await enrollmentRows(course.id);
    await enrollment.revokeEnrollment(course.id, row.id, actorId);
    await expect(services.getCourseLibraryDetails(organizationId, profileId, course.id)).rejects.toMatchObject({
      statusCode: 404
    });
    expect(
      (await queries.getEnrolledCourses({ orgId: organizationId, profileId })).map((entry) => entry.id)
    ).not.toContain(course.id);
    await expect(enrollment.selfEnroll(organizationId, course.id, learner())).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it('lets a learner self-enroll again after a revoked self-enrollment', async () => {
    const course = await createCourse();
    await enrollment.selfEnroll(organizationId, course.id, learner());
    const [first] = await enrollmentRows(course.id);
    await enrollment.revokeEnrollment(course.id, first.id, actorId);
    expect((await services.getCourseLibraryDetails(organizationId, profileId, course.id)).hasAccess).toBe(false);
    const rejoined = await enrollment.selfEnroll(organizationId, course.id, learner());
    expect(rejoined.alreadyJoined).toBe(false);
    const rows = await enrollmentRows(course.id);
    expect(rows.map((row) => row.status).sort()).toEqual(['ACTIVE', 'REVOKED']);
  });

  it('serializes concurrent self-enrollment and never resets completion on a retry', async () => {
    const course = await createCourse();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => enrollment.selfEnroll(organizationId, course.id, learner()))
    );
    expect(results.filter((result) => !result.alreadyJoined)).toHaveLength(1);
    expect(mocks.email).toHaveBeenCalledOnce();
    const rows = await enrollmentRows(course.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ employeeId, kind: 'SELF', status: 'ACTIVE' });
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(members).toHaveLength(1);
    const completedAt = '2026-10-20T00:00:00.000Z';
    await database.db
      .update(database.groupmember)
      .set({ completedAt })
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect((await enrollment.selfEnroll(organizationId, course.id, learner())).alreadyJoined).toBe(true);
    const [member] = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(new Date(member.completedAt!).toISOString()).toBe(completedAt);
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it('denies inactive employees, deactivated memberships, non-employees and outsiders', async () => {
    const course = await createCourse();
    await database.db
      .update(database.employee)
      .set({ status: 'SUSPENDED' })
      .where(database.eq(database.employee.id, employeeId));
    await expect(services.listCourseLibrary(organizationId, profileId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(enrollment.selfEnroll(organizationId, course.id, learner())).rejects.toMatchObject({
      statusCode: 403
    });
    await database.db
      .update(database.employee)
      .set({ status: 'ACTIVE' })
      .where(database.eq(database.employee.id, employeeId));
    await database.db
      .update(database.organizationmember)
      .set({ status: 'DEACTIVATED' })
      .where(database.eq(database.organizationmember.id, memberId));
    await expect(services.listCourseLibrary(organizationId, profileId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(enrollment.selfEnroll(organizationId, course.id, learner())).rejects.toMatchObject({
      statusCode: 403
    });
    await expect(services.listCourseLibrary(organizationId, randomUUID())).rejects.toMatchObject({ statusCode: 403 });

    const visitorId = randomUUID();
    const visitorEmail = await createProfile(visitorId);
    await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: visitorId, email: visitorEmail, roleId: 3, verified: true });
    await expect(
      enrollment.selfEnroll(organizationId, course.id, { id: visitorId, email: visitorEmail })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(await enrollmentRows(course.id)).toHaveLength(0);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('does not self-enroll a course with self-enrollment off, including one closed after listing', async () => {
    const closed = await createCourse({ metadata: { allowSelfEnrollment: false } });
    const course = await createCourse();
    await expect(services.getCourseLibraryDetails(organizationId, profileId, closed.id)).rejects.toMatchObject({
      statusCode: 404
    });
    await expect(enrollment.selfEnroll(organizationId, closed.id, learner())).rejects.toMatchObject({
      statusCode: 404
    });
    expect((await services.getCourseLibraryDetails(organizationId, profileId, course.id)).canSelfEnroll).toBe(true);
    await database.db
      .update(database.course)
      .set({ metadata: { allowSelfEnrollment: false } })
      .where(database.eq(database.course.id, course.id));
    await expect(enrollment.selfEnroll(organizationId, course.id, learner())).rejects.toMatchObject({
      statusCode: 404
    });
    expect(await enrollmentRows(closed.id)).toHaveLength(0);
    expect(await enrollmentRows(course.id)).toHaveLength(0);
  });

  it('creates private defaults even when copying open metadata', async () => {
    const course = await createCourse();
    const [created] = await queries.createCourse({
      title: 'Copied course',
      description: 'Copied',
      groupId: course.groupId,
      metadata: { showInLibrary: true, allowSelfEnrollment: true, goals: 'Preserved goals' }
    });
    expect(created.metadata).toMatchObject({
      allowSelfEnrollment: false,
      goals: 'Preserved goals'
    });
  });

  it('uses the same filtered count for pagination and literal search characters', async () => {
    for (let index = 0; index < 4; index += 1) await createCourse({ title: `Literal %_ ${index}` });
    await createCourse({ title: 'Other course' });
    const result = await services.listCourseLibrary(organizationId, profileId, { search: '%_', page: 2, limit: 2 });
    expect(result.total).toBe(4);
    expect(result.data).toHaveLength(2);
    expect(result.data.every((course) => course.title.includes('%_'))).toBe(true);
  });
});
