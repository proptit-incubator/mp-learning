import { createEnrollments, recordCourseCompletion } from '@cio/db/queries/course/enrollment';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@cio/db/drizzle';
import * as schema from '@cio/db/schema';
import { eq } from 'drizzle-orm';
import {
  getLearningAnalyticsActivity,
  getLearningAnalyticsSnapshot,
  getLearningAssignments,
  getRecentLearningCompletions
} from '@cio/db/queries/dash/learning-analytics';
import { listEmployeeEnrollments } from '@cio/db/queries/course/enrollment';
import { ensureLatestCycleCertificate } from '@cio/db/queries/course/certificate-issue';

const ORGANIZATION_SCOPE = { kind: 'organization' } as const;

type TestTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback(run: (transaction: TestTransaction) => Promise<void>) {
  const rollback = new Error('ROLLBACK_ANALYTICS_TEST');
  try {
    await db.transaction(async (transaction) => {
      await run(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function createPopulation(transaction: TestTransaction) {
  await transaction.insert(schema.submissionstatus).values({ id: 1, label: 'Submitted' }).onConflictDoNothing();
  const profiles = await transaction.select({ id: schema.profile.id }).from(schema.profile).limit(2);
  if (profiles.length !== 2) throw new Error('Analytics integration tests require two local test profiles');

  const siteName = `analytics-test-${randomUUID()}`;
  const [organization] = await transaction
    .insert(schema.organization)
    .values({ name: 'Analytics integration', siteName })
    .returning();
  const employeeIds: string[] = [];
  for (const profile of profiles) {
    const email = `${randomUUID()}@example.com`;
    const [member] = await transaction
      .insert(schema.organizationmember)
      .values({ organizationId: organization.id, profileId: profile.id, email, roleId: 3 })
      .returning();
    const [employee] = await transaction
      .insert(schema.employee)
      .values({
        organizationId: organization.id,
        memberId: member.id,
        employeeCode: randomUUID().slice(0, 12).toUpperCase(),
        fullname: 'Learner',
        email,
        status: 'ACTIVE',
        activatedAt: new Date().toISOString()
      })
      .returning();
    employeeIds.push(employee.id);
  }
  return { organizationId: organization.id, profileId: profiles[0].id, employeeId: employeeIds[0] };
}

async function createCourse(
  transaction: TestTransaction,
  organizationId: string,
  employeeId: string,
  options: { dueDate?: string | null; batchLabel?: string | null; recertificationMonths?: number | null } = {}
) {
  const [group] = await transaction
    .insert(schema.group)
    .values({ name: 'Analytics test course', organizationId })
    .returning();
  const [course] = await transaction
    .insert(schema.course)
    .values({
      title: 'Analytics test course',
      description: '',
      groupId: group.id,
      isPublished: true,
      recertificationMonths: options.recertificationMonths ?? null
    })
    .returning();
  const [enrollment] = await createEnrollments(
    {
      courseIds: [course.id],
      employeeIds: [employeeId],
      kind: 'ASSIGNED',
      dueDate: options.dueDate ?? null,
      batchLabel: options.batchLabel ?? null
    },
    transaction
  );
  const [member] = await transaction.select().from(schema.groupmember).where(eq(schema.groupmember.groupId, group.id));
  return { courseId: course.id, memberId: member.id, enrollmentId: enrollment.id };
}

describe.skipIf(process.env.MP_ANALYTICS_DB_TESTS !== 'true')('internal learning analytics database', () => {
  it('isolates organizations and returns an empty report for an empty population', async () => {
    const snapshot = await getLearningAnalyticsSnapshot(randomUUID(), ORGANIZATION_SCOPE);
    expect(snapshot.employees).toBe(0);
    expect(snapshot.assignments).toBe(0);
    expect(snapshot.courses).toEqual([]);
    expect(snapshot.attention).toEqual([]);
    expect(snapshot.departments).toEqual([]);
  });

  it('reports progress from content and completion from recorded completion cycles', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId, employeeId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, employeeId, { batchLabel: 'Q4' });
      const lessons = await transaction
        .insert(schema.lesson)
        .values([
          { title: 'Lesson 1', slug: 'lesson-1', courseId, order: 0 },
          { title: 'Lesson 2', slug: 'lesson-2', courseId, order: 1 }
        ])
        .returning();
      await transaction
        .insert(schema.lessonCompletion)
        .values({ lessonId: lessons[0].id, profileId, isComplete: true });
      const pending = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(pending).toMatchObject({
        employees: 2,
        enrolledEmployees: 1,
        assignments: 1,
        in_progress: 1,
        completed: 0
      });
      expect(pending.courses[0].progress).toBe(50);
      expect(pending.batches).toEqual([expect.objectContaining({ batchLabel: 'Q4', assigned: 1, in_progress: 1 })]);
      expect(pending.attention.some((employee) => employee.assigned === 0)).toBe(true);

      await recordCourseCompletion(
        {
          courseId,
          groupMemberId: memberId,
          profileId,
          completedAt: new Date().toISOString(),
          recertificationMonths: null
        },
        transaction
      );
      const completed = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(completed.completed).toBe(1);
      const page = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { page: 1, limit: 25 },
        transaction
      );
      expect(page.total).toBe(1);
      expect(page.rows[0]).toMatchObject({ state: 'completed', progress: 100 });
    });
  });

  it('counts an exercise that must be passed only once a graded submission passes it', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, employeeId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, employeeId);
      const [exercise] = await transaction
        .insert(schema.exercise)
        .values({ title: 'Quiz', slug: 'quiz', courseId, order: 0, completionPolicy: 'passed', passThreshold: 80 })
        .returning();
      await transaction
        .insert(schema.question)
        .values({ exerciseId: exercise.id, title: 'Q1', points: 10, questionTypeId: 1 });
      const [submission] = await transaction
        .insert(schema.submission)
        .values({ exerciseId: exercise.id, submittedBy: memberId, courseId, total: 5, gradingState: 'completed' })
        .returning();

      const failed = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(failed.courses[0].progress).toBe(0);
      expect(
        ((await listEmployeeEnrollments(employeeId, transaction))[0] as { progressPercent?: number }).progressPercent
      ).toBe(0);

      await transaction.update(schema.submission).set({ total: 9 }).where(eq(schema.submission.id, submission.id));
      const passed = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(passed.courses[0].progress).toBe(100);
      expect(
        ((await listEmployeeEnrollments(employeeId, transaction))[0] as { progressPercent?: number }).progressPercent
      ).toBe(100);
    });
  });

  it('lists only certificates still in force for the overview', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId, employeeId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, employeeId);
      expect(await getRecentLearningCompletions(organizationId, ORGANIZATION_SCOPE, 5, transaction)).toEqual({
        total: 0,
        recent: []
      });

      await recordCourseCompletion(
        {
          courseId,
          groupMemberId: memberId,
          profileId,
          completedAt: new Date().toISOString(),
          recertificationMonths: null
        },
        transaction
      );
      const withoutCertificate = await getRecentLearningCompletions(organizationId, ORGANIZATION_SCOPE, 5, transaction);
      const issuedAt = new Date().toISOString();
      const certificate = await ensureLatestCycleCertificate(
        courseId,
        profileId,
        { code: randomUUID().slice(0, 12), issuedAt },
        transaction
      );
      const withCertificate = await getRecentLearningCompletions(organizationId, ORGANIZATION_SCOPE, 5, transaction);
      await transaction
        .update(schema.courseCertificateIssue)
        .set({ expiresAt: '2020-01-01T00:00:00.000Z' })
        .where(eq(schema.courseCertificateIssue.id, certificate!.id));
      const afterExpiry = await getRecentLearningCompletions(organizationId, ORGANIZATION_SCOPE, 5, transaction);
      await transaction
        .update(schema.courseCertificateIssue)
        .set({ expiresAt: null, status: 'revoked' })
        .where(eq(schema.courseCertificateIssue.id, certificate!.id));
      const afterRevocation = await getRecentLearningCompletions(organizationId, ORGANIZATION_SCOPE, 5, transaction);

      expect(withoutCertificate.total).toBe(0);
      expect(withCertificate.total).toBe(1);
      expect(withCertificate.recent[0]).toMatchObject({ courseId, profileId, fullname: 'Learner' });
      expect(afterExpiry.total).toBe(0);
      expect(afterRevocation.total).toBe(0);
    });
  });

  it('breaks the report down by department and narrows it to one department', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, employeeId } = await createPopulation(transaction);
      const [department] = await transaction
        .insert(schema.department)
        .values({ organizationId, name: 'Kế toán', nameKey: 'kế toán' })
        .returning();
      await transaction
        .update(schema.employee)
        .set({ departmentId: department.id })
        .where(eq(schema.employee.id, employeeId));
      await createCourse(transaction, organizationId, employeeId);

      const snapshot = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(snapshot.departments).toEqual([
        expect.objectContaining({ departmentId: department.id, department: 'Kế toán', employees: 1, assigned: 1 }),
        expect.objectContaining({ departmentId: null, department: '', employees: 1, assigned: 0 })
      ]);

      const accounting = await getLearningAnalyticsSnapshot(
        organizationId,
        ORGANIZATION_SCOPE,
        { departmentId: department.id },
        transaction
      );
      expect(accounting).toMatchObject({ employees: 1, assignments: 1 });
      const unassigned = await getLearningAnalyticsSnapshot(
        organizationId,
        ORGANIZATION_SCOPE,
        { departmentId: 'none' },
        transaction
      );
      expect(unassigned).toMatchObject({ employees: 1, assignments: 0 });
    });
  });

  it('pages and filters assignments on the server', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, employeeId } = await createPopulation(transaction);
      const first = await createCourse(transaction, organizationId, employeeId);
      await createCourse(transaction, organizationId, employeeId, { batchLabel: 'Q4' });

      const page = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { page: 1, limit: 1 },
        transaction
      );
      expect(page).toMatchObject({ total: 2, page: 1, limit: 1 });
      expect(page.rows).toHaveLength(1);

      const second = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { page: 2, limit: 1 },
        transaction
      );
      expect(second.rows[0].enrollmentId).not.toBe(page.rows[0].enrollmentId);

      const byCourse = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { courseId: first.courseId, page: 1, limit: 25 },
        transaction
      );
      expect(byCourse.rows.map((row) => row.courseId)).toEqual([first.courseId]);
      const byBatch = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { batchLabel: 'Q4', state: 'not_started', page: 1, limit: 25 },
        transaction
      );
      expect(byBatch.total).toBe(1);

      await transaction
        .update(schema.employee)
        .set({ fullname: 'Nguyễn Văn Đức' })
        .where(eq(schema.employee.id, employeeId));
      const bySearch = await getLearningAssignments(
        organizationId,
        ORGANIZATION_SCOPE,
        {},
        { search: 'nguyen van duc', page: 1, limit: 25 },
        transaction
      );
      expect(bySearch.total).toBe(2);
    });
  });

  it('distinguishes overdue, expired and waived assignments and excludes inactive employees', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId, employeeId } = await createPopulation(transaction);
      const pastDue = new Date(Date.now() - 86400000).toISOString();
      const overdue = await createCourse(transaction, organizationId, employeeId, { dueDate: pastDue });
      const recurring = await createCourse(transaction, organizationId, employeeId, { recertificationMonths: 12 });
      await transaction.insert(schema.courseCompletionRecord).values({
        courseId: recurring.courseId,
        profileId,
        groupMemberId: recurring.memberId,
        cycleNumber: 1,
        completedAt: '2024-01-01T00:00:00.000Z',
        validUntil: '2025-01-01T00:00:00.000Z'
      });
      const report = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(report).toMatchObject({ overdue: 1, expired: 1, completed: 0 });

      await transaction
        .update(schema.courseEnrollment)
        .set({ status: 'WAIVED', waiverReason: 'Certified elsewhere' })
        .where(eq(schema.courseEnrollment.id, overdue.enrollmentId));
      const waived = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(waived).toMatchObject({ overdue: 0, waived: 1 });

      await transaction
        .update(schema.employee)
        .set({ status: 'SUSPENDED' })
        .where(eq(schema.employee.organizationId, organizationId));
      const inactive = await getLearningAnalyticsSnapshot(organizationId, ORGANIZATION_SCOPE, {}, transaction);
      expect(inactive.employees).toBe(0);
      expect(inactive.assignments).toBe(0);
    });
  });

  it('buckets learning in Vietnam time, counts submission attempts, and excludes future/out-of-period events', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId, employeeId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, employeeId);
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      const firstDayStart = new Date(`${today}T00:00:00+07:00`).getTime() - 6 * 86400000;
      const inside = new Date(firstDayStart + 1800000).toISOString();
      const outside = new Date(firstDayStart - 1800000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      const lessons = await transaction
        .insert(schema.lesson)
        .values([
          { title: 'Inside', slug: 'inside', courseId, order: 0 },
          { title: 'Outside', slug: 'outside', courseId, order: 1 },
          { title: 'Future', slug: 'future', courseId, order: 2 }
        ])
        .returning();
      await transaction.insert(schema.lessonCompletion).values([
        { lessonId: lessons[0].id, profileId, isComplete: true, createdAt: inside, updatedAt: inside },
        { lessonId: lessons[1].id, profileId, isComplete: true, createdAt: outside, updatedAt: outside },
        { lessonId: lessons[2].id, profileId, isComplete: true, createdAt: future, updatedAt: future }
      ]);
      const [exercise] = await transaction
        .insert(schema.exercise)
        .values({ title: 'Legacy lesson exercise', lessonId: lessons[0].id, order: 3, slug: 'legacy' })
        .returning();
      await transaction.insert(schema.submission).values([
        { exerciseId: exercise.id, submittedBy: memberId, createdAt: inside },
        { exerciseId: exercise.id, submittedBy: memberId, createdAt: inside }
      ]);
      const activity = await getLearningAnalyticsActivity(organizationId, ORGANIZATION_SCOPE, 7, {}, transaction);
      expect(activity.activeLearners).toBe(1);
      expect(activity.lessonsCompleted).toBe(1);
      expect(activity.submissions).toBe(2);
      expect(activity.daily).toHaveLength(7);
      expect(activity.daily[0].lessons).toBe(1);
      expect(activity.daily[0].submissions).toBe(2);
      const longerPeriod = await getLearningAnalyticsActivity(organizationId, ORGANIZATION_SCOPE, 30, {}, transaction);
      expect(longerPeriod.lessonsCompleted).toBe(2);
    });
  });
});
