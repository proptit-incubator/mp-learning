import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env.COURSE_ACCESS_TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('learner course publication visibility', () => {
  let database: typeof import('@cio/db/drizzle');
  let enrollment: typeof import('@cio/db/queries/course/enrollment');
  let getEnrolledCourses: (typeof import('@cio/db/queries/course'))['getEnrolledCourses'];
  let getCourse: (typeof import('@cio/core/services/course/course'))['getCourse'];
  const organizationId = randomUUID();
  const profileId = randomUUID();
  const email = `${profileId}@example.com`;
  let employeeId: string;

  beforeAll(async () => {
    const databaseName = decodeURIComponent(new URL(testDatabaseUrl!).pathname.slice(1));
    if (!databaseName.endsWith('_test')) throw new Error('Course visibility tests require a dedicated test database');

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected database for course visibility tests');

    enrollment = await import('@cio/db/queries/course/enrollment');
    getEnrolledCourses = (await import('@cio/db/queries/course')).getEnrolledCourses;
    getCourse = (await import('@cio/core/services/course/course')).getCourse;
    await database.db
      .insert(database.role)
      .values([{ id: 3, type: 'STUDENT' }])
      .onConflictDoNothing();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Course visibility test' });
    await database.db.insert(database.user).values({ id: profileId, email, name: 'Test learner', emailVerified: true });
    await database.db
      .insert(database.profile)
      .values({ id: profileId, email, fullname: 'Test learner', username: profileId, isEmailVerified: true });
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId, email, roleId: 3, verified: true, status: 'ACTIVE' })
      .returning();
    const [employee] = await database.db
      .insert(database.employee)
      .values({
        organizationId,
        memberId: member.id,
        employeeCode: profileId.slice(0, 12).toUpperCase(),
        fullname: 'Test learner',
        email,
        status: 'ACTIVE',
        activatedAt: new Date().toISOString()
      })
      .returning();
    employeeId = employee.id;
  }, 30000);

  async function createCourse(isPublished: boolean) {
    const groupId = randomUUID();
    const courseId = randomUUID();
    await database.db.insert(database.group).values({ id: groupId, name: 'Test course group', organizationId });
    await database.db
      .insert(database.course)
      .values({ id: courseId, groupId, title: 'Publication test', description: 'Learner access test', isPublished });
    await database.db.insert(database.lesson).values({ courseId, title: 'Lesson', slug: 'lesson', order: 1 });
    return { courseId, groupId };
  }

  async function assign(courseIds: string[], kind: 'ASSIGNED' | 'SELF' = 'ASSIGNED') {
    return enrollment.createEnrollments({ courseIds, employeeIds: [employeeId], kind });
  }

  async function listedIds() {
    return (await getEnrolledCourses({ orgId: organizationId, profileId })).map((course) => course.id);
  }

  it('hides an unpublished assigned course from My Learning until published and keeps the enrollment when hidden', async () => {
    const course = await createCourse(false);
    await assign([course.courseId]);
    expect(await listedIds()).not.toContain(course.courseId);

    await database.db
      .update(database.course)
      .set({ isPublished: true })
      .where(database.eq(database.course.id, course.courseId));
    const published = await getEnrolledCourses({ orgId: organizationId, profileId });
    const entry = published.find((enrolled) => enrolled.id === course.courseId);
    expect(entry?.enrollment).toMatchObject({ kind: 'ASSIGNED', state: 'not_started' });
    expect(entry?.hasLiveSession).toBe(false);
    expect(entry).not.toHaveProperty('isRequired');
    expect(entry).not.toHaveProperty('learningSources');

    await database.db
      .update(database.course)
      .set({ isPublished: false })
      .where(database.eq(database.course.id, course.courseId));
    expect(await listedIds()).not.toContain(course.courseId);
    const rows = await database.db
      .select()
      .from(database.courseEnrollment)
      .where(database.eq(database.courseEnrollment.courseId, course.courseId));
    expect(rows).toHaveLength(1);
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId));
    expect(members).toHaveLength(1);
  });

  it('applies the publication rule to every course in an assignment batch and drops revoked enrollments', async () => {
    const draft = await createCourse(false);
    const published = await createCourse(true);
    const revoked = await createCourse(true);
    const created = await assign([draft.courseId, published.courseId, revoked.courseId]);
    expect(created).toHaveLength(3);
    const revokedRow = created.find((row) => row.courseId === revoked.courseId)!;
    await enrollment.revokeEnrollment(revokedRow.id, null);
    const courses = await listedIds();
    expect(courses).not.toContain(draft.courseId);
    expect(courses).toContain(published.courseId);
    expect(courses).not.toContain(revoked.courseId);
  });

  it('prefers the assignment over a self-enrollment in the My Learning summary', async () => {
    const course = await createCourse(true);
    await assign([course.courseId], 'SELF');
    await assign([course.courseId], 'ASSIGNED');
    const entries = (await getEnrolledCourses({ orgId: organizationId, profileId })).filter(
      (enrolled) => enrolled.id === course.courseId
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].enrollment?.kind).toBe('ASSIGNED');
  });

  it('keeps draft content protected while allowing an enrolled learner to open a published course', async () => {
    const draft = await createCourse(false);
    const published = await createCourse(true);
    await assign([draft.courseId, published.courseId]);
    await expect(getCourse(draft.courseId, undefined, profileId)).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
      statusCode: 404
    });
    const opened = await getCourse(published.courseId, undefined, profileId);
    expect(opened.id).toBe(published.courseId);
  });
});
