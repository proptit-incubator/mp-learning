import {
  getLearningAnalyticsActivity,
  getLearningAnalyticsSnapshot,
  getLearningAssignments
} from '@cio/db/queries/dash';
import type { LearningAnalyticsFilter, LearningAnalyticsScope } from '@cio/db/queries/dash/learning-analytics';
import type { LearningAssignmentsQuery } from '@cio/utils/validation/dash';
import { getEmployeeAccess } from '@cio/db/queries/organization';
import { AppError, ErrorCodes } from '@api/utils/errors';

/**
 * Admins, L&D and HR see the whole organization, managers their reporting line and course team members the courses
 * they run. Throws 403 for everyone else.
 */
export async function resolveLearningAnalyticsScope(orgId: string, actorId: string): Promise<LearningAnalyticsScope> {
  const access = await getEmployeeAccess(orgId, actorId);
  if (access?.canViewOrgReports) return { kind: 'organization' };

  if (access?.isManager && access.employeeId) return { kind: 'reports', managerEmployeeId: access.employeeId };

  if (access?.teachesCourses) return { kind: 'courses', teamProfileId: actorId };

  throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
}

/** Throws 403 unless the actor may see organization-wide reports (Admin, L&D or HR). */
export async function assertOrganizationReportViewer(orgId: string, actorId: string): Promise<void> {
  const access = await getEmployeeAccess(orgId, actorId);
  if (!access?.canViewOrgReports) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
}

export async function getLearningAnalytics(
  orgId: string,
  actorId: string,
  days: 7 | 30 | 90,
  filter: LearningAnalyticsFilter = {}
) {
  const scope = await resolveLearningAnalyticsScope(orgId, actorId);
  const [snapshot, activity] = await Promise.all([
    getLearningAnalyticsSnapshot(orgId, scope, filter),
    getLearningAnalyticsActivity(orgId, scope, days, filter)
  ]);
  const assignmentsToComplete = snapshot.assignments - snapshot.waived;
  const completionRate =
    assignmentsToComplete > 0 ? Math.round((snapshot.completed / assignmentsToComplete) * 100) : null;
  const unassignedEmployees = snapshot.employees - snapshot.enrolledEmployees;
  const generatedAt = new Date().toISOString();

  return {
    snapshot,
    activity,
    completionRate,
    unassignedEmployees,
    generatedAt,
    days,
    scope: scope.kind,
    departmentId: filter.departmentId ?? null
  };
}

/** One page of the assignments behind the report, in the viewer's scope. */
export async function getLearningAssignmentsPage(orgId: string, actorId: string, query: LearningAssignmentsQuery) {
  const scope = await resolveLearningAnalyticsScope(orgId, actorId);
  const { departmentId, ...assignmentQuery } = query;
  return getLearningAssignments(orgId, scope, { departmentId }, assignmentQuery);
}
