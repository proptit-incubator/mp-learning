import { AppError, ErrorCodes } from '@api/utils/errors';
import { addGroupMember, getGroupMemberIdByGroupAndProfile } from '@cio/db/queries/group';
import { getCourseWithOrgData, lockCourseStatusForAccept } from '@cio/db/queries/course';
import { createEnrollments, ensureLearnerMembership, findEmployeeByProfile } from '@cio/db/queries/course/enrollment';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import type { DbOrTxClient } from '@cio/db/drizzle';
import type { TGroupmember } from '@cio/db/types';
import { captureLearnersEnrolled } from '@api/services/product-events';
import { buildMemberSource, emitCourseMemberAddedWebhookEvent } from '@cio/core/services/webhook/emit';
import { ROLE } from '@cio/utils/constants';
import type { TInviteLinkWithContext } from '@cio/db/queries/invite-link';
import type { TInviteLinkResourceType } from '@cio/utils/validation/invite-link';

/** What the public join page renders. */
export type InviteLinkPreview = {
  resourceType: TInviteLinkResourceType;
  resourceName: string;
  description: string | null;
  coverImage: string | null;
  /** False when the resource has stopped accepting joins. */
  isResourceOpen: boolean;
};

export type InviteLinkEnrollResult = {
  isFreshJoin: boolean;
  enrolledMembers?: TGroupmember[];
};

type InviteLinkHandler = {
  resolveOrganizationId(resourceId: string): Promise<string>;
  preview(context: TInviteLinkWithContext): InviteLinkPreview;
  /**
   * Runs inside the accept transaction, after org membership is written. Re-locks and
   * re-validates the resource so a concurrent close/archive can't slip past this
   * accept, then performs the durable membership write. Throws if no longer open.
   */
  enrollMembership(
    tx: DbOrTxClient,
    context: TInviteLinkWithContext,
    profileId: string,
    email: string
  ): Promise<InviteLinkEnrollResult>;
  /** Runs after the transaction commits. Best-effort: webhooks, cache invalidation, analytics. */
  afterCommit(
    context: TInviteLinkWithContext,
    profileId: string,
    email: string,
    result: InviteLinkEnrollResult
  ): Promise<void>;
  redirectTo(context: TInviteLinkWithContext): string;
};

function requireCourse(context: TInviteLinkWithContext) {
  if (!context.course) {
    throw new AppError('This invite link is no longer valid', ErrorCodes.NOT_FOUND, 404);
  }

  return context.course;
}

async function enrollLearnerFromLink(
  tx: DbOrTxClient,
  organizationId: string,
  courseId: string,
  groupId: string,
  profileId: string,
  email: string
): Promise<InviteLinkEnrollResult> {
  const employee = await findEmployeeByProfile(organizationId, profileId, tx);
  if (!employee || employee.status !== 'ACTIVE') {
    throw new AppError('Only active employees can join this course', ErrorCodes.FORBIDDEN, 403);
  }

  const created = await createEnrollments({ courseIds: [courseId], employeeIds: [employee.id], kind: 'SELF' }, tx);
  if (created.length === 0) return { isFreshJoin: false };

  const member = await ensureLearnerMembership(groupId, profileId, email, tx);
  return { isFreshJoin: true, enrolledMembers: member ? [member] : [] };
}

const courseHandler: InviteLinkHandler = {
  async resolveOrganizationId(courseId) {
    const courseOrgData = await getCourseWithOrgData(courseId);

    if (!courseOrgData?.orgId) {
      throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
    }

    return courseOrgData.orgId;
  },

  preview(context) {
    const course = requireCourse(context);

    return {
      resourceType: 'COURSE',
      resourceName: course.title,
      description: course.description,
      coverImage: null,
      // Unpublished courses still accept link joins, like invites bypass self-enrollment.
      isResourceOpen: course.status === 'ACTIVE'
    };
  },

  async enrollMembership(tx, context, profileId, email) {
    const course = requireCourse(context);
    const locked = await lockCourseStatusForAccept(tx, course.id);

    if (!locked || locked.status !== 'ACTIVE') {
      throw new AppError('This invite is no longer accepting new members', ErrorCodes.VALIDATION_ERROR, 403);
    }

    if (!locked.groupId) {
      throw new AppError('This course is not available for enrollment', ErrorCodes.VALIDATION_ERROR, 400);
    }

    if (context.invite.roleId === ROLE.STUDENT) {
      return enrollLearnerFromLink(tx, context.organization.id, course.id, locked.groupId, profileId, email);
    }

    const existingMemberId = await getGroupMemberIdByGroupAndProfile(locked.groupId, profileId, tx);
    const isFreshJoin = !existingMemberId;
    if (!isFreshJoin) return { isFreshJoin };

    const enrolledMembers = await addGroupMember(
      {
        groupId: locked.groupId,
        roleId: context.invite.roleId,
        profileId,
        email
      },
      tx
    );

    return { isFreshJoin, enrolledMembers };
  },

  async afterCommit(context, profileId, _email, { enrolledMembers }) {
    const course = requireCourse(context);

    for (const courseMember of enrolledMembers ?? []) {
      await emitCourseMemberAddedWebhookEvent(course.id, courseMember, {
        source: buildMemberSource('invite_link', { inviteLinkId: context.invite.id }),
        actorProfileId: profileId
      });
    }

    await invalidateOrgStats(context.organization.id);

    captureLearnersEnrolled(enrolledMembers ?? [], 'invite_link');
  },

  redirectTo() {
    return '/lms';
  }
};

/**
 * A new resource type needs: one entry here, one `INVITE_LINK_RESOURCE_TYPE` value,
 * one nullable FK column, and create/toggle routes on that resource's router.
 */
export const INVITE_LINK_HANDLERS: Record<TInviteLinkResourceType, InviteLinkHandler> = {
  COURSE: courseHandler
};

export function getInviteLinkHandler(resourceType: string): InviteLinkHandler {
  const handler = INVITE_LINK_HANDLERS[resourceType as TInviteLinkResourceType];

  if (!handler) {
    throw new AppError('Unsupported invite link type', ErrorCodes.VALIDATION_ERROR, 400);
  }

  return handler;
}
