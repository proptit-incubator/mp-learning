import { ROLE } from '@cio/utils/constants';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { isUniqueConstraintViolation } from '@cio/utils/errors';
import {
  addCourseMember,
  deleteCourseMember,
  getCourseMember,
  hasCourseLearnerHistory,
  getPaginatedCourseMembers,
  updateCourseMember
} from '@cio/db/queries/course/people';
import { resetStudentCourseProgress } from '@cio/db/queries/course/reset-progress';

import type { TAddCourseMembers } from '@cio/utils/validation/course/people';
import type { TGroupmember } from '@cio/db/types';
import type { PaginatedCourseMember, PaginatedCourseMembersOptions } from '@cio/db/queries/course/people';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import {
  buildMemberSource,
  emitCourseMemberAddedWebhookEvent,
  emitCourseMemberRemovedWebhookEvent,
  emitCourseWebhookEvent,
  type TWebhookMemberSource
} from '@cio/core/services/webhook/emit';
import { getCourseProgress } from '@cio/db/queries/course/course';
import { getWebhookLastActiveAt } from '@cio/db/queries/webhook';
import { calcCourseProgressPercent } from '@api/utils/course-completion';
import { getCourseWithOrgData, getOrgIdByCourseId } from '@cio/db/queries/course';
import { getProfileById } from '@cio/db/queries/auth';
import { buildEmailFromName, buildEmailBranding } from '@cio/email';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import { getCourseMemberProgressSummaries } from './member-progress';
import { getWelcomeSessionIcs } from './session-invite';
import type { TEventSource } from '@cio/core/services/posthog';
import { captureLearnersEnrolled } from '@api/services/product-events';
import { listCourseEnrollments } from '@cio/db/queries/course/enrollment';

/**
 * Attaches only `stage` to a page of members.
 *
 * Progress, last login and enrollment date already come from the query, but
 * `stage` names a content item in canonical course order, which is derived in
 * application code rather than SQL.
 */
async function addMemberStages(courseId: string, members: PaginatedCourseMember[]) {
  const progressSummaries = await getCourseMemberProgressSummaries(
    courseId,
    members.map((member) => ({
      profileId: member.profileId ?? '',
      roleId: member.roleId,
      createdAt: member.createdAt ?? null
    }))
  );

  return members.map((member) => {
    const progress =
      member.profileId && member.roleId === ROLE.STUDENT ? progressSummaries.get(member.profileId) : undefined;

    return { ...member, stage: progress?.stage ?? null };
  });
}

/**
 * Gets one filtered, sorted page of course members for a course.
 * @param courseId Course ID
 * @param query Page, page size, search term, filters and sort
 * @returns One page of course members with profile, progress and stage data, plus pagination totals
 */
export async function listPaginatedCourseMembers(courseId: string, query: PaginatedCourseMembersOptions) {
  try {
    const result = await getPaginatedCourseMembers(courseId, query);
    const items = await addMemberStages(courseId, result.items);
    const enrollments = await listCourseEnrollments(courseId);
    const learners = items.map((item) => ({
      ...item,
      enrollments:
        item.roleId === ROLE.STUDENT ? enrollments.filter((enrollment) => enrollment.profileId === item.profileId) : []
    }));

    return {
      ...result,
      items: learners
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to list paginated course members',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

export type TMemberWebhookContext = { source?: TWebhookMemberSource; actorProfileId?: string | null };

async function findLastActiveAt(organizationId: string | null, profileId: string) {
  if (!organizationId) return null;

  return getWebhookLastActiveAt(organizationId, profileId);
}

async function readProgressAtRemoval(courseId: string, memberId: string) {
  try {
    const member = await getCourseMember(courseId, memberId);

    if (!member?.profileId || member.roleId !== ROLE.STUDENT) return null;

    const progress = await getCourseProgress(courseId, member.profileId);
    const percent = calcCourseProgressPercent({
      lessonsCompleted: progress.lessonsCompleted,
      totalLessons: progress.lessonsCount,
      exercisesCompleted: progress.exercisesCompleted,
      exercisesCount: progress.exercisesCount
    });

    const organizationId = await getOrgIdByCourseId(courseId);
    const lastActiveAt = await findLastActiveAt(organizationId, member.profileId);

    return { percent, completed: progress.completedAt !== null, lastActiveAt };
  } catch (error) {
    console.error('readProgressAtRemoval error:', error);

    return null;
  }
}

/**
 * Adds a course member (person) to a course
 * @param courseId Course ID
 * @param data Member data (profileId, roleId, email, name)
 * @returns Created member
 */
/**
 * Updates a course member
 * @param courseId Course ID
 * @param memberId Member ID
 * @param data Partial member data to update
 * @returns Updated member
 */
export async function updateMember(courseId: string, memberId: string, data: Partial<TGroupmember>) {
  try {
    const existingMember = await getCourseMember(courseId, memberId);
    if (!existingMember) {
      throw new AppError('Course member not found', ErrorCodes.NOT_FOUND, 404);
    }
    if (data.roleId !== undefined && data.roleId !== existingMember.roleId && data.roleId !== ROLE.STUDENT) {
      throw new AppError(
        'Courses have no instructors: administrators and L&D already manage every course',
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const updated = await updateCourseMember(courseId, memberId, data);
    if (!updated) {
      throw new AppError('Course member not found', ErrorCodes.NOT_FOUND, 404);
    }

    const previousRoleId = existingMember.roleId;
    const nextRoleId = data.roleId ?? previousRoleId;
    const studentRoleChanged =
      data.roleId !== undefined && (previousRoleId === ROLE.STUDENT || nextRoleId === ROLE.STUDENT);

    if (studentRoleChanged) {
      const statsOrgId = await getOrgIdByCourseId(courseId);
      await invalidateOrgStats(statsOrgId);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (isUniqueConstraintViolation(error)) {
      throw new AppError('Another member of this course already uses that email', ErrorCodes.CONFLICT, 409);
    }
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to update course member',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Deletes a course member
 * @param courseId Course ID
 * @param memberId Member ID
 * @returns Deleted member
 */
export async function deleteMember(
  courseId: string,
  memberId: string,
  context: { actorProfileId?: string | null; reason?: string | null } = {}
) {
  try {
    const existing = await getCourseMember(courseId, memberId);
    if (existing?.roleId === ROLE.STUDENT && existing.profileId) {
      throw new AppError('Cancel a learning source instead of deleting learner history', ErrorCodes.CONFLICT, 409);
    }

    const hasHistory = existing ? await hasCourseLearnerHistory(courseId, memberId, existing.profileId) : false;
    if (hasHistory) {
      throw new AppError('This identity has retained learning history', ErrorCodes.CONFLICT, 409);
    }

    const progressBeforeRemoval = await readProgressAtRemoval(courseId, memberId);
    const deleted = await deleteCourseMember(courseId, memberId);
    if (!deleted) {
      throw new AppError('Course member not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (deleted.roleId === ROLE.STUDENT) {
      const statsOrgId = await getOrgIdByCourseId(courseId);
      await invalidateOrgStats(statsOrgId);
    }

    await emitCourseMemberRemovedWebhookEvent(courseId, deleted, {
      actorProfileId: context.actorProfileId,
      reason: context.reason,
      progressAtRemoval: progressBeforeRemoval
    });

    return deleted;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to delete course member',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Resets all learner progress for a course member while keeping them enrolled.
 */
export async function resetMemberCourseProgress(courseId: string, memberId: string, actorProfileId: string) {
  try {
    const member = await getCourseMember(courseId, memberId);
    if (!member || !member.profileId) {
      throw new AppError('Course member not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (member.roleId !== ROLE.STUDENT) {
      throw new AppError('Only student progress can be reset', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const { summary, resetLessonIds, resetExerciseIds } = await resetStudentCourseProgress({
      courseId,
      groupMemberId: memberId,
      profileId: member.profileId
    });

    console.info('resetMemberCourseProgress', {
      actorProfileId,
      courseId,
      memberId,
      summary
    });

    const statsOrgId = await getOrgIdByCourseId(courseId);
    await invalidateOrgStats(statsOrgId);

    const profileId = member.profileId;
    const lessonResetEvents = profileId
      ? resetLessonIds.map((lessonId) =>
          emitCourseWebhookEvent(courseId, 'lesson.completion.updated', { lessonId, profileId, isComplete: false })
        )
      : [];
    const exerciseResetEvents = resetExerciseIds.map((exerciseId) =>
      emitCourseWebhookEvent(courseId, 'exercise.completion.updated', {
        exerciseId,
        memberId,
        profileId,
        isComplete: false
      })
    );

    await Promise.all([...lessonResetEvents, ...exerciseResetEvents]);

    return summary;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to reset course member progress',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}
