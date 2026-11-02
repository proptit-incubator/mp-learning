import { db } from '@cio/db/drizzle';
import {
  createEnrollments,
  findEmployeeByProfile,
  getEnrollmentById,
  listCourseEnrollments as listCourseEnrollmentRows,
  listFullyAssignedEmployeeIds,
  previewEnrollmentTargets,
  resolveEmployeeIds,
  revokeEnrollment as revokeEnrollmentRow,
  updateEnrollmentDueDate,
  waiveEnrollment as waiveEnrollmentRow
} from '@cio/db/queries/course/enrollment';
import { getCourseEmployeeContext } from '@cio/db/queries/course/employees';
import { getCourseLibrary, lockCourseForEnrollment } from '@cio/db/queries/course/library';
import { getEmployeeAccess, lockEmployeeOrganization } from '@cio/db/queries/organization';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import type { TGroupmember } from '@cio/db/types';
import type { DbOrTxClient } from '@cio/db/drizzle';
import { getCourseWithOrgData } from '@cio/db/queries/course';
import * as schema from '@cio/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { isSelfEnrollmentAllowed } from '@cio/utils/functions';
import type { TAssignCourses, TAssignmentPreview, TWaiveEnrollment } from '@cio/utils/validation/course/enrollment';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { buildMemberSource, emitCourseMemberAddedWebhookEvent } from '@cio/core/services/webhook/emit';
import { buildEmailBranding, buildEmailFromName, escapeHtml } from '@cio/email';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { captureLearnersEnrolled } from '@api/services/product-events';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import { AppError, ErrorCodes } from '@api/utils/errors';

async function requireTrainingManager(courseId: string, actorId: string) {
  const context = await getCourseEmployeeContext(courseId);
  const allowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorId);
  if (!context?.organizationId || !context.groupId || !allowed) {
    throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
  }

  return context as typeof context & { organizationId: string; groupId: string };
}

async function requireOrgTrainingManager(organizationId: string, actorId: string) {
  const access = await getEmployeeAccess(organizationId, actorId);
  if (!access || !access.canManage) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);

  return access;
}

async function loadGroupMember(groupId: string, profileId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select()
    .from(schema.groupmember)
    .where(and(eq(schema.groupmember.groupId, groupId), eq(schema.groupmember.profileId, profileId)))
    .limit(1);
  return (row as TGroupmember | undefined) ?? null;
}

function formatDueDate(dueDate: string | null | undefined) {
  if (!dueDate) return undefined;

  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date(dueDate)
  );
}

type AssignedEmployeeNotification = {
  enrollmentId: string;
  employeeId: string;
  email: string;
  profileId: string | null;
};

async function sendAssignmentEmails(
  courseId: string,
  organizationId: string,
  recipients: AssignedEmployeeNotification[],
  options: { dueDate?: string | null; batchLabel?: string | null; message?: string }
) {
  if (!recipients.length) return;

  const course = await getCourseWithOrgData(courseId);
  if (!course) return;

  const branding = buildEmailBranding({ name: course.orgName, avatarUrl: course.orgAvatarUrl, theme: course.orgTheme });
  const baseUrl = getDashboardBaseUrl({
    siteName: course.orgSiteName,
    customDomain: course.orgCustomDomain,
    isCustomDomainVerified: course.orgIsCustomDomainVerified
  });
  const loginUrl = new URL(`/courses/${courseId}`, baseUrl).href;
  const from = buildEmailFromName(course.orgName || 'MP Learning');
  const customMessage = options.message ? escapeHtml(options.message).replaceAll('\n', '<br>') : undefined;
  await Promise.all(
    recipients.map((recipient) =>
      enqueueTransactionalEmail('studentCourseWelcome', {
        to: recipient.email,
        from,
        fields: {
          orgName: course.orgName || 'MP Transformation',
          courseName: course.courseTitle || '',
          loginUrl,
          customMessage,
          dueDate: formatDueDate(options.dueDate),
          batchLabel: options.batchLabel ?? undefined,
          branding
        },
        idempotencyKey: `course-assignment:${recipient.enrollmentId}`,
        preference: { organizationId, recipientProfileId: recipient.profileId ?? undefined }
      })
    )
  );
}

async function loadRecipients(enrollmentIds: string[]): Promise<AssignedEmployeeNotification[]> {
  if (!enrollmentIds.length) return [];

  return db
    .select({
      enrollmentId: schema.courseEnrollment.id,
      employeeId: schema.employee.id,
      email: schema.employee.email,
      profileId: schema.organizationmember.profileId
    })
    .from(schema.courseEnrollment)
    .innerJoin(schema.employee, eq(schema.employee.id, schema.courseEnrollment.employeeId))
    .innerJoin(schema.organizationmember, eq(schema.organizationmember.id, schema.employee.memberId))
    .where(inArray(schema.courseEnrollment.id, enrollmentIds));
}

async function emitAssignmentEffects(
  organizationId: string,
  actorId: string,
  created: Array<{ id: string; courseId: string }>,
  input: Pick<TAssignCourses, 'dueDate' | 'batchLabel' | 'message' | 'sendEmail'>
) {
  const effects: Promise<unknown>[] = [invalidateOrgStats(organizationId)];
  const recipients = await loadRecipients(created.map((row) => row.id));
  const recipientById = new Map(recipients.map((recipient) => [recipient.enrollmentId, recipient]));
  const source = buildMemberSource('admin');
  const byCourse = new Map<string, AssignedEmployeeNotification[]>();
  for (const row of created) {
    const recipient = recipientById.get(row.id);
    if (!recipient) continue;

    byCourse.set(row.courseId, [...(byCourse.get(row.courseId) ?? []), recipient]);
  }
  for (const [courseId, courseRecipients] of byCourse) {
    const context = await getCourseEmployeeContext(courseId);
    for (const recipient of courseRecipients) {
      if (!recipient.profileId || !context?.groupId) continue;

      const member = await loadGroupMember(context.groupId, recipient.profileId);
      if (!member) continue;

      effects.push(emitCourseMemberAddedWebhookEvent(courseId, member, { source, actorProfileId: actorId }));
      captureLearnersEnrolled([member], 'admin');
    }
    if (input.sendEmail) effects.push(sendAssignmentEmails(courseId, organizationId, courseRecipients, input));
  }
  const outcomes = await Promise.allSettled(effects);
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') console.error('Course assignment follow-up failed', outcome.reason);
  }
}

/** Counts who an assignment would reach and lists employees who already hold every selected course. */
export async function previewAssignment(organizationId: string, actorId: string, input: TAssignmentPreview) {
  await requireOrgTrainingManager(organizationId, actorId);
  const [preview, assignedEmployeeIds] = await Promise.all([
    previewEnrollmentTargets(organizationId, input.courseIds, {
      employeeIds: input.employeeIds,
      ...(input.filter ?? {})
    }),
    listFullyAssignedEmployeeIds(input.courseIds)
  ]);
  return { ...preview, assignedEmployeeIds };
}

/** Assigns one or more courses to employees picked directly or by department / job title / everyone. */
export async function assignCourses(organizationId: string, actorId: string, input: TAssignCourses) {
  await requireOrgTrainingManager(organizationId, actorId);
  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(organizationId, transaction);
    const courses = await transaction
      .select({ id: schema.course.id, status: schema.course.status, isTemplate: schema.course.isTemplate })
      .from(schema.course)
      .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
      .where(and(inArray(schema.course.id, input.courseIds), eq(schema.group.organizationId, organizationId)));
    if (
      courses.length !== input.courseIds.length ||
      courses.some((course) => course.status !== 'ACTIVE' || course.isTemplate)
    ) {
      throw new AppError('Course unavailable', ErrorCodes.VALIDATION_ERROR, 400, 'courseIds');
    }
    for (const course of courses) {
      const allowed = await isCourseTeamMemberOrOrgAdmin(course.id, actorId, transaction);
      if (!allowed) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
    }

    const employeeIds = await resolveEmployeeIds(
      organizationId,
      { employeeIds: input.employeeIds, ...(input.filter ?? {}) },
      transaction
    );
    if (!employeeIds.length)
      throw new AppError('No employees selected', ErrorCodes.VALIDATION_ERROR, 400, 'employeeIds');

    const created = await createEnrollments(
      {
        courseIds: input.courseIds,
        employeeIds,
        kind: 'ASSIGNED',
        assignedBy: actorId,
        dueDate: input.dueDate ?? null,
        batchLabel: input.batchLabel ?? null,
        message: input.message
      },
      transaction
    );
    return { created, targeted: employeeIds.length * input.courseIds.length };
  });
  await emitAssignmentEffects(organizationId, actorId, result.created, input);

  return { assigned: result.created.length, existing: result.targeted - result.created.length };
}

/** Course-scoped variant used by the course People tab. */
export async function assignCourseLearners(
  courseId: string,
  actorId: string,
  input: Omit<TAssignCourses, 'courseIds'>
) {
  const context = await requireTrainingManager(courseId, actorId);
  return assignCourses(context.organizationId, actorId, { ...input, courseIds: [courseId] });
}

export async function listCourseEnrollments(courseId: string, actorId: string) {
  await requireTrainingManager(courseId, actorId);
  return listCourseEnrollmentRows(courseId);
}

async function requireCourseEnrollment(courseId: string, enrollmentId: string, actorId: string) {
  const context = await requireTrainingManager(courseId, actorId);
  const enrollment = await getEnrollmentById(enrollmentId);
  if (!enrollment || enrollment.courseId !== courseId) {
    throw new AppError('Enrollment not found', ErrorCodes.NOT_FOUND, 404);
  }

  return { context, enrollment };
}

export async function revokeEnrollment(courseId: string, enrollmentId: string, actorId: string) {
  const { context } = await requireCourseEnrollment(courseId, enrollmentId, actorId);
  const revoked = await revokeEnrollmentRow(enrollmentId, actorId);
  await invalidateOrgStats(context.organizationId);
  return { revoked: Boolean(revoked) };
}

export async function waiveEnrollment(
  courseId: string,
  enrollmentId: string,
  actorId: string,
  input: TWaiveEnrollment
) {
  const { context } = await requireCourseEnrollment(courseId, enrollmentId, actorId);
  const waived = await waiveEnrollmentRow(enrollmentId, {
    actorId,
    reason: input.reason,
    expiresAt: input.expiresAt ?? null
  });
  if (!waived) throw new AppError('Only active assignments can be waived', ErrorCodes.CONFLICT, 409);

  await invalidateOrgStats(context.organizationId);
  return waived;
}

export async function changeEnrollmentDueDate(
  courseId: string,
  enrollmentId: string,
  actorId: string,
  dueDate: string | null
) {
  const { context } = await requireCourseEnrollment(courseId, enrollmentId, actorId);
  const updated = await updateEnrollmentDueDate(enrollmentId, dueDate);
  if (!updated) throw new AppError('Only assignments carry a due date', ErrorCodes.CONFLICT, 409);

  await invalidateOrgStats(context.organizationId);
  return updated;
}

/** Self-service enrollment from the training library. The learner must be an active employee. */
export async function selfEnroll(organizationId: string, courseId: string, user: { id: string; email: string }) {
  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(organizationId, transaction);
    const access = await getEmployeeAccess(organizationId, user.id, transaction);
    if (!access) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);

    const course = await lockCourseForEnrollment(courseId, transaction);
    const context = await getCourseEmployeeContext(courseId, transaction);
    if (!course || context?.organizationId !== organizationId || !context.groupId) {
      throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
    }

    const library = await getCourseLibrary(organizationId, user.id, { courseId }, transaction);
    const details = library.data[0];
    if (!details) throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);

    if (details.hasAccess) return null;

    if (!isSelfEnrollmentAllowed(course.metadata)) {
      throw new AppError('This course is assigned by the training team', ErrorCodes.FORBIDDEN, 403);
    }

    const employee = await findEmployeeByProfile(organizationId, user.id, transaction);
    if (!employee || employee.status !== 'ACTIVE') {
      throw new AppError('Only active employees can enroll', ErrorCodes.FORBIDDEN, 403);
    }

    const [created] = await createEnrollments(
      { courseIds: [courseId], employeeIds: [employee.id], kind: 'SELF' },
      transaction
    );
    if (!created) return null;

    const member = await loadGroupMember(context.groupId, user.id, transaction);
    return { enrollment: created, member, email: employee.email, employeeId: employee.id };
  });

  if (result?.member) {
    const member = result.member;
    captureLearnersEnrolled([member], 'self');
    const recipient = {
      enrollmentId: result.enrollment.id,
      employeeId: result.employeeId,
      email: result.email,
      profileId: user.id
    };
    const effects = await Promise.allSettled([
      invalidateOrgStats(organizationId),
      emitCourseMemberAddedWebhookEvent(courseId, member, {
        source: buildMemberSource('self_enroll'),
        actorProfileId: user.id
      }),
      sendAssignmentEmails(courseId, organizationId, [recipient], {})
    ]);
    for (const effect of effects) {
      if (effect.status === 'rejected') console.error('Course enrollment follow-up failed', effect.reason);
    }
  }

  return { alreadyJoined: !result, redirectTo: `/courses/${courseId}/lessons?next=true` };
}
