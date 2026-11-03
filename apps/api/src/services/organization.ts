import { listCourseLibrary } from './course/library';
import { emitOrganizationMemberWebhookEvent } from '@cio/core/services/webhook/emit';
import { AppError, ErrorCodes } from '@api/utils/errors';
import type { OrgAudienceMember, OrgAudiencePagination, OrgAudienceQuery } from '@api/types/org';
import type {
  TCourseReorder,
  TGetAudienceQuery,
  TGetOrganizationCoursesQuery
} from '@cio/utils/validation/organization';
import type { TOrganization } from '@db/types';
import {
  deleteOrganizationAudienceMember,
  getActiveOrganizationPlan,
  getFirstOrganizationWithPlans,
  getLatestOrgInvitesByEmails,
  getOrganizationAudience,
  getOrganizationAudienceMember,
  getOrganizationById,
  getOrganizationTeam,
  revokeActiveOrganizationInvitesByEmails,
  updateOrganization
} from '@cio/db/queries/organization';
import {
  countOrgCourses,
  getCoursesById,
  getEnrolledCourses,
  getOrgCourses,
  reorderOrgCourses as reorderOrgCoursesQuery
} from '@cio/db/queries/course';
import { countAssetsByOrg } from '@cio/db/queries/assets';
import { countTagsByOrg, getCourseIdsByTagSlugs, getCourseTagsByCourseIdsForOrganization } from '@cio/db/queries/tag';
import { getLastLogin, getProfileCourseProgress, getUserExercisesStats } from '@cio/db/queries/analytics';

import type { OrganizationWithPlans } from '@cio/db/queries/organization/types';
import { canUseBasicAuthSettings, PLAN } from '@cio/utils/plans';
import { env } from '@cio/core/config/env';
import { ROLE } from '@cio/utils/constants';
import { deriveAudienceMemberStatus } from '@api/utils/audience-member-status';
import { getProfileById } from '@cio/db/queries/auth';
import { recordOrganizationInviteAudits } from './organization/invite';

/**
 * Gets organizations with optional filters
 * @param filters - Filter options (siteName, customDomain, isCustomDomainVerified)
 * @returns Array of organizations with plans
 */
export async function getOrganizationsWithFilters(filters?: {
  siteName?: string;
  customDomain?: string;
  isCustomDomainVerified?: boolean;
}): Promise<OrganizationWithPlans[]> {
  try {
    const organization = await getFirstOrganizationWithPlans();
    if (!organization) return [];

    const matchesFilters =
      (!filters?.siteName || organization.siteName === filters.siteName) &&
      (!filters?.customDomain || organization.customDomain === filters.customDomain) &&
      (filters?.isCustomDomainVerified === undefined ||
        organization.isCustomDomainVerified === filters.isCustomDomainVerified);

    return matchesFilters ? [organization] : [];
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch organizations',
      ErrorCodes.ORGANIZATION_NOT_FOUND,
      500
    );
  }
}

/**
 * Gets the first organization with plans - for self-hosted single-org mode
 * @returns First organization or null
 */
export async function getFirstOrgForSelfHosted(): Promise<OrganizationWithPlans | null> {
  try {
    return await getFirstOrganizationWithPlans();
  } catch (error) {
    console.error('getFirstOrgForSelfHosted error:', error);
    return null;
  }
}

/**
 * Gets organization team members (non-students)
 * @param orgId - The organization ID
 * @returns Array of team members
 */
export async function getOrgTeam(orgId: string) {
  try {
    const team = await getOrganizationTeam(orgId);
    return team;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch organization team',
      ErrorCodes.ORG_TEAM_FETCH_FAILED,
      500
    );
  }
}

/**
 * Gets organization audience (students)
 * @param orgId - The organization ID
 * @returns Audience members with invite status for profile-less rows
 */
export async function getOrgAudience(
  orgId: string,
  query: TGetAudienceQuery
): Promise<{ items: OrgAudienceMember[]; pagination: OrgAudiencePagination; query: OrgAudienceQuery }> {
  try {
    const audienceResult = await getOrganizationAudience(orgId, query);
    const audience = audienceResult.items;

    const emailsWithoutProfile = audience.filter((m) => !m.profileId && m.email).map((m) => m.email.toLowerCase());

    const invites = await getLatestOrgInvitesByEmails(orgId, emailsWithoutProfile);
    const inviteByEmail = new Map(invites.map((i) => [i.email.toLowerCase(), i]));

    return {
      items: audience.map(
        (member): OrgAudienceMember => ({
          ...member,
          status: deriveAudienceMemberStatus(
            member.profileId,
            member.email ? inviteByEmail.get(member.email.toLowerCase()) : undefined
          )
        })
      ),
      pagination: {
        page: audienceResult.page,
        limit: audienceResult.limit,
        total: audienceResult.total,
        totalPages: audienceResult.totalPages
      },
      query: {
        page: audienceResult.page,
        limit: audienceResult.limit,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: query.status,
        inviteStatus: query.inviteStatus,
        enrollment: query.enrollment,
        completion: query.completion,
        certificate: query.certificate,
        lastLoginBefore: query.lastLoginBefore,
        lastActiveBefore: query.lastActiveBefore,
        excludeRecentJoiners: query.excludeRecentJoiners
      }
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch organization audience',
      ErrorCodes.ORG_AUDIENCE_FETCH_FAILED,
      500
    );
  }
}

export async function getOrgAudienceMember(orgId: string, memberId: number): Promise<OrgAudienceMember> {
  try {
    const member = await getOrganizationAudienceMember(orgId, memberId);

    if (!member) {
      throw new AppError('Audience member not found', ErrorCodes.NOT_FOUND, 404);
    }

    if (!member.profileId && member.email) {
      const invites = await getLatestOrgInvitesByEmails(orgId, [member.email.toLowerCase()]);
      const invite = invites[0];

      return {
        ...member,
        status: deriveAudienceMemberStatus(member.profileId, invite)
      };
    }

    return {
      ...member,
      status: deriveAudienceMemberStatus(member.profileId, undefined)
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch audience member',
      ErrorCodes.ORG_AUDIENCE_FETCH_FAILED,
      500
    );
  }
}

/**
 * Removes a student audience member from an organization
 * @param orgId - The organization ID
 * @param memberId - The student member ID to remove
 * @returns Deleted member
 */
export async function removeAudienceMember(orgId: string, memberId: number, removedByProfileId?: string) {
  try {
    const deleted = await deleteOrganizationAudienceMember(orgId, memberId);
    if (!deleted) {
      throw new AppError('Audience member not found', ErrorCodes.ORG_AUDIENCE_REMOVE_FAILED, 404);
    }

    await emitOrganizationMemberWebhookEvent('organization.member.removed', orgId, deleted, removedByProfileId ?? null);

    if (deleted.email && removedByProfileId) {
      const targetEmail = deleted.email.toLowerCase();
      const revoked = await revokeActiveOrganizationInvitesByEmails(orgId, [targetEmail], removedByProfileId);
      await recordOrganizationInviteAudits(
        revoked.map((invite) => ({
          inviteId: invite.id,
          organizationId: orgId,
          eventType: 'REVOKED' as const,
          actorProfileId: removedByProfileId,
          targetEmail,
          ipAddress: null,
          userAgent: null,
          metadata: { reason: 'member_removed' }
        }))
      );
    }

    return deleted;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to remove audience member',
      ErrorCodes.ORG_AUDIENCE_REMOVE_FAILED,
      500
    );
  }
}

/**
 * Reorders courses for an organization (manual display order on public surfaces)
 * @param orgId - The organization ID
 * @param orders - Array of course IDs with their new display positions
 */
export async function reorderOrgCourses(orgId: string, orders: TCourseReorder['courses']) {
  try {
    await reorderOrgCoursesQuery(orgId, orders);
  } catch (error) {
    if (error instanceof Error && error.message.includes('does not belong')) {
      throw new AppError(error.message, ErrorCodes.VALIDATION_ERROR, 400);
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Failed to reorder courses',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Gets organization courses with role-based data filtering
 * @param orgId - The organization ID
 * @param userId - User ID for role-based filtering (required)
 * @param userRole - User's role in the organization (from context)
 * @returns Object with role and courses array
 * - Admins: all courses with totalStudents
 * - Tutors: assigned courses with totalStudents
 */
export async function getOrganizationCourses(
  orgId: string,
  userId: string,
  userRole: number,
  query: TGetOrganizationCoursesQuery
) {
  try {
    if (!userRole) {
      throw new AppError('Invalid permissions', ErrorCodes.UNAUTHORIZED, 403);
    }

    const { page, limit, search, status, sort, order } = query;
    const listQuery = {
      page,
      limit,
      search,
      tags: query.tags,
      status,
      sort,
      order
    };
    const tagSlugs = query.tags
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let filteredCourseIds: string[] | undefined = undefined;
    if (tagSlugs && tagSlugs.length > 0) {
      filteredCourseIds = await getCourseIdsByTagSlugs(orgId, tagSlugs);
      if (filteredCourseIds.length === 0) {
        return {
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          },
          query: listQuery
        };
      }
    }

    switch (userRole) {
      case ROLE.ADMIN: {
        const courses = await getOrgCourses({
          orgId,
          courseIds: filteredCourseIds,
          page,
          limit,
          search,
          publishedStatus: status,
          sortKey: sort,
          order
        });
        const tagsByCourseId = await getCourseTagsByCourseIdsForOrganization(
          orgId,
          courses.items.map((course) => course.id)
        );

        return {
          items: courses.items.map((course) => ({
            ...course,
            tags: tagsByCourseId[course.id] ?? []
          })),
          pagination: {
            page: courses.page,
            limit: courses.limit,
            total: courses.total,
            totalPages: courses.totalPages
          },
          query: listQuery
        };
      }
      case ROLE.TUTOR: {
        const courses = await getOrgCourses({
          orgId,
          profileId: userId,
          courseIds: filteredCourseIds,
          page,
          limit,
          search,
          publishedStatus: status,
          sortKey: sort,
          order
        });
        const tagsByCourseId = await getCourseTagsByCourseIdsForOrganization(
          orgId,
          courses.items.map((course) => course.id)
        );

        return {
          items: courses.items.map((course) => ({
            ...course,
            tags: tagsByCourseId[course.id] ?? []
          })),
          pagination: {
            page: courses.page,
            limit: courses.limit,
            total: courses.total,
            totalPages: courses.totalPages
          },
          query: listQuery
        };
      }
      default:
        throw new AppError('Invalid permissions', ErrorCodes.UNAUTHORIZED, 403);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch courses',
      ErrorCodes.COURSES_FETCH_FAILED,
      500
    );
  }
}

export async function getOrganizationNavCounts(orgId: string, userId: string, userRole: number) {
  try {
    const courseProfileId = userRole === ROLE.ADMIN ? undefined : userId;
    const [courses, media, tags] = await Promise.all([
      countOrgCourses({ orgId, profileId: courseProfileId }),
      countAssetsByOrg(orgId),
      countTagsByOrg(orgId)
    ]);

    return { courses, media, tags };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch organization nav counts',
      ErrorCodes.COURSES_FETCH_FAILED,
      500
    );
  }
}

/**
 * Gets user enrolled courses by organization orgId
 *
 * @param orgId - The organization ID
 * @param userId - User ID for filtering
 * @returns Array of enrolled courses
 */
export async function getUserEnrolledCourses(orgId: string, userId: string) {
  try {
    return getEnrolledCourses({ orgId, profileId: userId });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch enrolled courses',
      ErrorCodes.COURSES_FETCH_FAILED,
      500
    );
  }
}

/**
 * Gets recommended courses (published courses user isn't enrolled in) for an organization
 * Used in LMS explore page
 *
 * @param orgId - The organization ID
 * @param userId - User ID to exclude enrolled courses
 * @returns Array of recommended courses
 */
export async function getRecommendedCourses(
  orgId: string,
  userId: string,
  limit?: number,
  page?: number,
  search?: string,
  sort?: 'date_created' | 'last_updated_at' | 'published' | 'lessons'
) {
  try {
    const query = { limit, page, search, sort };
    return listCourseLibrary(orgId, userId, query, true);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch recommended courses',
      ErrorCodes.COURSES_FETCH_FAILED,
      500
    );
  }
}

/**
 * Gets courses by organization orgId
 * @param orgId - The organization orgId
 * @returns Array of courses
 */
export async function getCoursesByOrgId(orgId: string) {
  try {
    return getCoursesById(orgId);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch courses',
      ErrorCodes.COURSES_FETCH_FAILED,
      500
    );
  }
}

/**
 * Updates an organization
 * @param orgId - The organization ID
 * @param data - Partial organization data to update
 * @returns Updated organization
 */

/** Nullable boolean columns, so an unset legacy row must compare equal to `false`. */
const ENTERPRISE_AUTH_FLAGS = ['disableSignup', 'disableEmailPassword', 'disableGoogleAuth'] as const;

type OrgAuthSettings = {
  signup?: { inviteOnly?: boolean };
  internalEnrollmentOnly?: boolean;
};

function hasEnterpriseAuthChange(existing: TOrganization, data: Partial<TOrganization>) {
  const flagChanged = ENTERPRISE_AUTH_FLAGS.some((key) => {
    if (!(key in data)) return false;

    return Boolean(data[key]) !== Boolean(existing[key]);
  });

  if (flagChanged) return true;

  if (!('disableSignupMessage' in data)) return false;

  return (data.disableSignupMessage ?? '') !== (existing.disableSignupMessage ?? '');
}

function hasBasicAuthChange(existing: TOrganization, data: Partial<TOrganization>) {
  const incoming = data.settings as OrgAuthSettings | null | undefined;
  if (!incoming) return false;

  const current = (existing.settings ?? {}) as OrgAuthSettings;

  const inviteOnlyChanged =
    incoming.signup !== undefined && Boolean(incoming.signup?.inviteOnly) !== Boolean(current.signup?.inviteOnly);
  const internalEnrollmentChanged =
    incoming.internalEnrollmentOnly !== undefined &&
    Boolean(incoming.internalEnrollmentOnly) !== Boolean(current.internalEnrollmentOnly);

  return inviteOnlyChanged || internalEnrollmentChanged;
}

/**
 * Plan gate for the Settings > Authentication > General controls. The dashboard
 * disables the switches an org cannot use, but the same fields are writable
 * through `PUT /organization`, so the entitlement is enforced here too.
 *
 * Only *changes* are gated. The dashboard sends the whole organization on every
 * save, so an unchanged locked field must never block an otherwise allowed edit.
 */
async function assertAuthSettingsEntitlement(orgId: string, data: Partial<TOrganization>) {
  const existing = await getOrganizationById(orgId);
  if (!existing) return;

  const enterpriseChanged = hasEnterpriseAuthChange(existing, data);
  const basicChanged = hasBasicAuthChange(existing, data);

  if (!enterpriseChanged && !basicChanged) return;

  const isSelfHosted = env.PUBLIC_IS_SELFHOSTED === 'true';
  const activePlan = await getActiveOrganizationPlan(orgId);
  const planName = activePlan?.planName ?? PLAN.BASIC;

  if (enterpriseChanged && !isSelfHosted && planName !== PLAN.ENTERPRISE) {
    throw new AppError('These authentication settings require an Enterprise plan', ErrorCodes.UPGRADE_REQUIRED, 403);
  }

  if (basicChanged && !canUseBasicAuthSettings(planName, isSelfHosted)) {
    throw new AppError('These authentication settings require a paid plan', ErrorCodes.UPGRADE_REQUIRED, 403);
  }
}

export async function updateOrg(orgId: string, data: Partial<TOrganization>) {
  try {
    const allowedSettings = new Set(['customization', 'settings', 'disableSignup', 'disableSignupMessage']);
    if (Object.keys(data).some((field) => !allowedSettings.has(field))) {
      throw new AppError(
        'MP Learning identity and deployment settings are managed by the system',
        ErrorCodes.VALIDATION_ERROR,
        403
      );
    }

    await assertAuthSettingsEntitlement(orgId, data);

    let updateData = data;

    if (data.customization) {
      const apps = { ...data.customization.apps };
      Reflect.deleteProperty(apps, 'poll');
      const customization = { ...data.customization, apps };
      updateData = { ...data, customization };
    }

    const organization = await updateOrganization(orgId, updateData);
    if (!organization) {
      throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
    }

    return organization;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to update organization',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * Helper function to sum array object values by key
 */
function sumArrObject<T>(arr: T[], key: keyof T): number {
  return arr.reduce((sum, item) => sum + ((item[key] as number) || 0), 0);
}

/**
 * Helper function to calculate percentage with rounding
 */
function calcPercentageWithRounding(a: number, b: number): number {
  if (b === 0) {
    return 0;
  }
  const rawPercentage = (a / b) * 100;
  const fixedString = rawPercentage.toFixed(1);
  const roundedNumber = parseFloat(fixedString);
  return isNaN(roundedNumber) ? 0 : roundedNumber;
}

/**
 * Gets user analytics for an organization
 * @param userId - The user ID (profile ID)
 * @param orgId - The organization ID
 * @returns User analytics data including courses, progress, and grades
 */
export async function getUserAnalytics(userId: string, orgId: string) {
  try {
    // Get user profile
    const profile = await getProfileById(userId);
    if (!profile) {
      throw new AppError('User profile not found', ErrorCodes.PROFILE_NOT_FOUND, 404);
    }

    // Get last login
    const lastSeen = await getLastLogin(userId);

    // Get courses for this org where user is enrolled
    const courses = await getEnrolledCourses({ orgId, profileId: userId });

    // Build analytics data for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        let userExercisesStats: Awaited<ReturnType<typeof getUserExercisesStats>> | null;
        try {
          userExercisesStats = await getUserExercisesStats(course.id, userId, { failOnError: true });
        } catch (error) {
          console.error('getUserAnalytics course exercises error:', error);
          userExercisesStats = null;
        }

        let courseProgress: Awaited<ReturnType<typeof getProfileCourseProgress>> | null;
        try {
          courseProgress = await getProfileCourseProgress(course.id, userId, { failOnError: true });
        } catch (error) {
          console.error('getUserAnalytics course progress error:', error);
          courseProgress = null;
        }

        const gradedExercises = (userExercisesStats ?? []).filter((exercises) => exercises.status === 3);
        const totalEarnedPoints = sumArrObject(gradedExercises, 'score');
        const totalPoints = sumArrObject(gradedExercises, 'totalPoints');

        const gradeablePoints = totalPoints > 0;
        const averageGrade = gradeablePoints ? calcPercentageWithRounding(totalEarnedPoints, totalPoints) : null;

        const progressData = courseProgress ?? {
          lessons_count: 0,
          lessons_completed: 0,
          exercises_count: 0,
          exercises_completed: 0
        };
        // A course's work is its lessons and its exercises, matching
        // `calcCourseProgress` in the dashboard and the audience roster. The
        // exercise counts were already here; only the percentage ignored them,
        // so a learner who watched everything and submitted nothing read 100%.
        const completedItems = (progressData.lessons_completed || 0) + (progressData.exercises_completed || 0);
        const totalItems = (progressData.lessons_count || 0) + (progressData.exercises_count || 0);
        const progressPercentage = courseProgress ? calcPercentageWithRounding(completedItems, totalItems) : 0;

        return {
          ...course,
          ...progressData,
          progress_failed: courseProgress === null,
          progress_percentage: progressPercentage,
          average_grade: averageGrade,
          exercises: userExercisesStats
        };
      })
    );

    // Overall progress folds the same items as the rows above, so the headline
    // figure and the per-course rows cannot disagree. Courses whose progress
    // lookup failed stay excluded, as main does.
    const progressCourses = coursesWithStats.filter((course) => !course.progress_failed);
    const totalItems = progressCourses.reduce(
      (acc, course) => acc + (course.lessons_count || 0) + (course.exercises_count || 0),
      0
    );
    const completedItems = progressCourses.reduce(
      (acc, course) => acc + (course.lessons_completed || 0) + (course.exercises_completed || 0),
      0
    );
    const overallCourseProgress = calcPercentageWithRounding(completedItems, totalItems);

    const graded = coursesWithStats.filter(
      (course): course is (typeof coursesWithStats)[number] & { average_grade: number } => course.average_grade !== null
    );
    const gradeTotal = graded.reduce((sum, course) => sum + course.average_grade, 0);
    const overallAverageGrade = graded.length === 0 ? null : Math.round(gradeTotal / graded.length);

    return {
      user: {
        id: userId,
        fullName: profile.fullname || '',
        email: profile.email || '',
        avatarUrl: profile.avatarUrl || '',
        lastSeen: lastSeen || undefined
      },
      courses: coursesWithStats,
      overallCourseProgress,
      overallAverageGrade
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : 'Failed to fetch user analytics',
      ErrorCodes.INTERNAL_ERROR,
      500
    );
  }
}
