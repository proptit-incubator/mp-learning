import { AppError, ErrorCodes } from '@api/utils/errors';
import { env } from '@cio/core/config/env';
import {
  getLearningAnalyticsSnapshot,
  getOrgStudentLoginsByDayOfWeek,
  getRecentLearningCompletions,
  getUserLoginStreak
} from '@cio/db/queries/dash';
import type { LearningAnalyticsScope } from '@cio/db/queries/dash/learning-analytics';
import { dashLoginActivityKey } from '@api/utils/redis/key-generators';
import { logRedisUnavailableOnce, redis } from '@cio/core/utils/redis/redis';
import {
  invalidateOrgStats,
  readOrgStatsVersionAndCache,
  writeOrgStatsCache
} from '@cio/core/utils/redis/org-stats-cache';

import type { OrganisationAnalytics } from '@api/types';

const TOP_COURSE_COUNT = 5;

async function loadOrganisationAnalyticsFromDatabase(
  orgId: string,
  scope: LearningAnalyticsScope
): Promise<OrganisationAnalytics> {
  const [snapshot, completions] = await Promise.all([
    getLearningAnalyticsSnapshot(orgId, scope),
    getRecentLearningCompletions(orgId, scope, TOP_COURSE_COUNT)
  ]);
  const topCourses = [...snapshot.courses].sort((a, b) => b.assigned - a.assigned).slice(0, TOP_COURSE_COUNT);

  return {
    totalCertificates: completions.total,
    numberOfCourses: snapshot.courses.length,
    totalStudents: snapshot.enrolledEmployees,
    topCourses: topCourses.map((course) => ({
      id: course.id,
      title: course.title,
      enrollments: course.assigned,
      completion: course.progress ?? 0,
      certification: course.assigned > 0 ? Math.round((course.completed / course.assigned) * 100) : 0
    })),
    recentCertifications: completions.recent.map((row) => ({
      id: row.profileId ?? '',
      avatarUrl: row.avatarUrl,
      name: row.fullname,
      courseId: row.courseId,
      course: row.courseTitle,
      date: row.completedAt
    }))
  };
}

/**
 * Overview numbers on the same population as the learning analytics page, narrowed to `scope`. Only the
 * organization-wide result is cached, since scoped results differ per viewer.
 */
export async function getOrganisationAnalytics(
  orgId: string,
  scope: LearningAnalyticsScope = { kind: 'organization' },
  bustCache = false
): Promise<OrganisationAnalytics> {
  try {
    if (scope.kind !== 'organization') return await loadOrganisationAnalyticsFromDatabase(orgId, scope);

    const { version, data: cached } = await readOrgStatsVersionAndCache<OrganisationAnalytics>(orgId);

    if (!bustCache && cached) {
      return cached;
    }

    const analytics = await loadOrganisationAnalyticsFromDatabase(orgId, scope);
    await writeOrgStatsCache(orgId, version, analytics);

    return analytics;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error('Failed to load organisation analytics:', error);
    throw new AppError('Failed to load organisation analytics', ErrorCodes.ORG_ANALYTICS_FETCH_FAILED, 500);
  }
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

type StudentLoginActivityRow = { day: string; count: number };

/** Redis TTL for login-activity chart payload (1 day). */
const LOGIN_ACTIVITY_CACHE_TTL_SECONDS = 86_400;

function parseLoginActivityCache(raw: string): StudentLoginActivityRow[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length !== 7) {
    return null;
  }

  const out: StudentLoginActivityRow[] = [];
  for (const item of parsed) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('day' in item) ||
      !('count' in item) ||
      typeof (item as { day: unknown }).day !== 'string' ||
      typeof (item as { count: unknown }).count !== 'number' ||
      !Number.isInteger((item as { count: number }).count) ||
      (item as { count: number }).count < 0
    ) {
      return null;
    }

    out.push({ day: (item as { day: string }).day, count: (item as { count: number }).count });
  }

  for (const label of DAY_LABELS) {
    if (!out.some((r) => r.day === label)) {
      return null;
    }
  }

  return out;
}

/** Day-of-week login chart; results cached in Redis (24h TTL) when `REDIS_URL` is set. */
export async function getStudentLoginActivity(
  orgId: string,
  days: number,
  bustCache = false
): Promise<StudentLoginActivityRow[]> {
  const cacheKey = dashLoginActivityKey(orgId, days);

  if (env.REDIS_URL && !bustCache) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const rows = parseLoginActivityCache(cached);
        if (rows) {
          return rows;
        }
      }
    } catch (error) {
      logRedisUnavailableOnce('Redis get failed for login activity cache, using database', error);
    }
  }

  try {
    const rows = await getOrgStudentLoginsByDayOfWeek(orgId, days);

    const countByDow = new Map(rows.map((r) => [r.dayOfWeek, r.count]));

    const result = DAY_LABELS.map((label, index) => ({
      day: label,
      count: countByDow.get(index) ?? 0
    }));

    if (env.REDIS_URL) {
      try {
        await redis.setEx(cacheKey, LOGIN_ACTIVITY_CACHE_TTL_SECONDS, JSON.stringify(result));
      } catch (error) {
        logRedisUnavailableOnce('Redis set failed for login activity cache, continuing', error);
      }
    }

    return result;
  } catch (error) {
    console.error('getStudentLoginActivity error:', error);
    throw new AppError('Failed to load login activity', ErrorCodes.ORG_ANALYTICS_FETCH_FAILED, 500);
  }
}

export async function getCurrentUserLoginStreak(userId: string) {
  try {
    return await getUserLoginStreak(userId);
  } catch (error) {
    console.error('getCurrentUserLoginStreak error:', error);
    throw new AppError('Failed to load login streak', ErrorCodes.ORG_ANALYTICS_FETCH_FAILED, 500);
  }
}

export { invalidateOrgStats };
