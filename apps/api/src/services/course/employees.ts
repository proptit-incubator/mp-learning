import { db } from '@cio/db/drizzle';
import * as schema from '@cio/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { TGroupmember } from '@cio/db/types';
import { findCourseEmployees, getCourseEmployeeContext, insertCourseEmployees } from '@cio/db/queries/course/employees';
import { getCourseWithOrgData } from '@cio/db/queries/course';
import { getEmployeeAccess, lockEmployeeOrganization } from '@cio/db/queries/organization';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import { buildEmailBranding, buildEmailFromName, escapeHtml } from '@cio/email';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { emitCourseMemberAddedWebhookEvent, buildMemberSource } from '@cio/core/services/webhook/emit';
import { ROLE } from '@cio/utils/constants';
import type { TWebhookMemberSource } from '@cio/core/services/webhook/emit';
import type { TEventSource } from '@cio/core/services/posthog';
import { captureLearnersEnrolled } from '@api/services/product-events';
import type { TAddCourseMembers } from '@cio/utils/validation/course/people';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import { createEnrollments } from '@cio/db/queries/course/enrollment';
import { lockCourseForEnrollment } from '@cio/db/queries/course/library';

export async function listAvailableCourseEmployees(courseId: string, search?: string) {
  const context = await getCourseEmployeeContext(courseId);
  if (!context?.organizationId || !context.groupId) throw new AppError('Course not found', ErrorCodes.NOT_FOUND, 404);

  return findCourseEmployees(context.organizationId, { search });
}

export async function enrollExistingCourseEmployees(
  courseId: string,
  actorProfileId: string,
  members: TAddCourseMembers,
  sendEmail = true,
  webhookSource?: TWebhookMemberSource,
  eventSource: TEventSource = 'dashboard'
) {
  const context = await getCourseEmployeeContext(courseId);
  if (!context?.organizationId || !context.groupId) throw new AppError('Course not found', ErrorCodes.NOT_FOUND, 404);

  const organizationId = context.organizationId;
  const groupId = context.groupId;
  const isAllowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorProfileId);
  if (!isAllowed) throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403);

  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(organizationId, transaction);
    const access = await getEmployeeAccess(organizationId, actorProfileId, transaction);
    if (!access) throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403);

    const course = await lockCourseForEnrollment(courseId, transaction);
    const allowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorProfileId, transaction);
    if (!allowed || !course || course.status !== 'ACTIVE' || course.isTemplate) {
      throw new AppError('Course unavailable', ErrorCodes.FORBIDDEN, 403);
    }

    if (members.some((member) => member.roleId !== ROLE.STUDENT) && access.role !== 'ADMIN') {
      throw new AppError('Only administrators can assign instructors', ErrorCodes.UNAUTHORIZED, 403);
    }

    const profileIds = members.flatMap((member) => (member.profileId ? [member.profileId] : []));
    if (!profileIds.length || profileIds.length !== members.length || new Set(profileIds).size !== profileIds.length) {
      throw new AppError('Select existing employees from the Employees tab', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const employees = await findCourseEmployees(organizationId, { profileIds }, transaction);
    if (employees.length !== profileIds.length) {
      throw new AppError(
        'Only active employees in this organization can be assigned',
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const employeeByProfile = new Map(employees.map((employee) => [employee.profileId, employee]));
    if (
      members.some(
        (member) =>
          member.roleId !== ROLE.STUDENT && !['ADMIN', 'TUTOR'].includes(employeeByProfile.get(member.profileId!)!.role)
      )
    ) {
      throw new AppError('Select an employee with an instructor role', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const staffValues = members
      .filter((member) => member.roleId !== ROLE.STUDENT)
      .map((member) => ({
        groupId,
        profileId: member.profileId!,
        roleId: member.roleId,
        email: employeeByProfile.get(member.profileId!)!.email
      }));
    const addedStaff = staffValues.length ? await insertCourseEmployees(staffValues, transaction) : [];
    const learnerEmployeeIds = members.flatMap((member) =>
      member.roleId === ROLE.STUDENT ? [employeeByProfile.get(member.profileId!)!.id] : []
    );
    const created = await createEnrollments(
      { courseIds: [courseId], employeeIds: learnerEmployeeIds, kind: 'ASSIGNED', assignedBy: actorProfileId },
      transaction
    );
    const createdEmployeeIds = new Set(created.map((row) => row.employeeId));
    const learnerProfileIds = employees
      .filter((employee) => createdEmployeeIds.has(employee.id))
      .map((employee) => employee.profileId!);
    const learners = learnerProfileIds.length
      ? await transaction
          .select()
          .from(schema.groupmember)
          .where(and(eq(schema.groupmember.groupId, groupId), inArray(schema.groupmember.profileId, learnerProfileIds)))
      : [];
    const assignmentIdByProfile = new Map(
      created.map((row) => [employees.find((employee) => employee.id === row.employeeId)?.profileId ?? '', row.id])
    );
    return { addedMembers: [...addedStaff, ...learners], assignmentIdByProfile };
  });

  captureLearnersEnrolled(result.addedMembers, 'admin', eventSource);
  const source = webhookSource ?? buildMemberSource('admin');
  const effects: Promise<unknown>[] = [invalidateOrgStats(organizationId)];
  for (const member of result.addedMembers) {
    effects.push(emitCourseMemberAddedWebhookEvent(courseId, member, { source, actorProfileId }));
    if (!sendEmail) continue;

    const assignmentId = member.profileId ? result.assignmentIdByProfile.get(member.profileId) : undefined;
    const notification = assignmentId
      ? { idempotencyKey: `course-assignment:${assignmentId}`, message: '' }
      : undefined;
    effects.push(sendCourseAccessEmail(courseId, member, organizationId, undefined, notification));
  }
  const outcomes = await Promise.allSettled(effects);
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') console.error('Course assignment follow-up failed', outcome.reason);
  }
  return result.addedMembers;
}

export async function sendCourseAccessEmail(
  courseId: string,
  member: TGroupmember,
  organizationId: string,
  courseInfo?: NonNullable<Awaited<ReturnType<typeof getCourseWithOrgData>>>,
  notification?: { idempotencyKey: string; message: string }
) {
  const course = courseInfo ?? (await getCourseWithOrgData(courseId));
  if (!course || !member.email) return;

  const branding = buildEmailBranding({ name: course.orgName, avatarUrl: course.orgAvatarUrl, theme: course.orgTheme });
  const baseUrl = getDashboardBaseUrl({
    siteName: course.orgSiteName,
    customDomain: course.orgCustomDomain,
    isCustomDomainVerified: course.orgIsCustomDomainVerified
  });
  const loginUrl = new URL(`/courses/${courseId}`, baseUrl).href;
  const from = buildEmailFromName(course.orgName || 'MP Learning');
  const customMessage = notification?.message ? escapeHtml(notification.message).replaceAll('\n', '<br>') : undefined;
  await enqueueTransactionalEmail('studentCourseWelcome', {
    to: member.email,
    from,
    fields: {
      orgName: course.orgName || 'MP Transformation',
      courseName: course.courseTitle || '',
      loginUrl,
      customMessage,
      branding
    },
    idempotencyKey: notification?.idempotencyKey ?? `employee-course-access:${member.id}`,
    preference: { organizationId, recipientProfileId: member.profileId ?? undefined }
  });
}
