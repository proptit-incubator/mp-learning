import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';
import type { LearningAnalyticsScope } from '@cio/db/queries/dash/learning-analytics';
import { getEmployeeAccess } from '@cio/db/queries/organization';
import { AppError, ErrorCodes } from '@api/utils/errors';

/**
 * Admins and HR see the whole organization, tutors the courses they teach, managers their reporting line.
 * Throws 403 for everyone else.
 */
export async function resolveLearningAnalyticsScope(orgId: string, actorId: string): Promise<LearningAnalyticsScope> {
  const access = await getEmployeeAccess(orgId, actorId);
  if (access?.canManage) return { kind: 'organization' };

  if (access?.role === 'TUTOR') return { kind: 'courses', teamProfileId: actorId };

  if (access?.role === 'MANAGER' && access.employeeId) {
    return { kind: 'reports', managerEmployeeId: access.employeeId };
  }

  throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
}

export async function getLearningAnalytics(orgId: string, actorId: string, days: 7 | 30 | 90) {
  const scope = await resolveLearningAnalyticsScope(orgId, actorId);
  const [snapshot, activity] = await Promise.all([
    getLearningAnalyticsSnapshot(orgId, scope),
    getLearningAnalyticsActivity(orgId, scope, days)
  ]);
  const completionRate =
    snapshot.assignments > 0 ? Math.round((snapshot.completed / snapshot.assignments) * 100) : null;
  const unassignedEmployees = snapshot.employees - snapshot.enrolledEmployees;
  const generatedAt = new Date().toISOString();

  return { snapshot, activity, completionRate, unassignedEmployees, generatedAt, days, scope: scope.kind };
}
