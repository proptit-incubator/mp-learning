import type { TPublicApiOrgAnalyticsQuery, TPublicApiOrgAnalyticsSection } from '@cio/utils/validation/public-api';
import {
  PUBLIC_API_ANALYTICS_TTL_SECONDS,
  PUBLIC_API_LOGIN_ACTIVITY_TTL_SECONDS,
  publicApiAnalyticsKey
} from '@api/utils/redis/key-generators';
import { assertOrgTeamMember } from '@api/services/v1/shared';
import { cachedRead, type CachedRead } from '@api/utils/redis/cached-read';
import { getCountryBreakdown, getCourseFunnel, getLandingStats, getTopCoursesByViews } from '@api/services/analytics';
import { getOrganisationAnalytics, getStudentLoginActivity } from '@api/services/dash';
import { ROLE } from '@cio/utils/constants';

const ADMIN_ONLY_SECTIONS: ReadonlySet<TPublicApiOrgAnalyticsSection> = new Set(['loginActivity']);

const TTL = PUBLIC_API_ANALYTICS_TTL_SECONDS;

// The public API keeps its own cache entry per section and skips the dashboard's (bustCache), so `generatedAt` is
// the real compute time. `limit` trims lists after the read, so it never adds cache keys.
async function readSection(
  orgId: string,
  section: TPublicApiOrgAnalyticsSection,
  days: number,
  limit: number
): Promise<CachedRead<unknown>> {
  const key = (...parts: Array<string | number>) => publicApiAnalyticsKey(section, orgId, ...parts);

  switch (section) {
    case 'overview': {
      const entry = await cachedRead(key(), TTL, () => getOrganisationAnalytics(orgId, { kind: 'organization' }, true));
      const { topCourses, recentCertifications, ...totals } = entry.data;
      return {
        ...entry,
        data: {
          ...totals,
          topCourses: topCourses.slice(0, limit),
          recentCertifications: recentCertifications.slice(0, limit)
        }
      };
    }
    case 'traffic':
      return cachedRead(key(days), TTL, () => getLandingStats(orgId, days, true));
    case 'countries': {
      const entry = await cachedRead(key(days), TTL, () => getCountryBreakdown(orgId, days, true));
      return { ...entry, data: entry.data.slice(0, limit) };
    }
    case 'funnel':
      return cachedRead(key(days), TTL, () => getCourseFunnel(orgId, days, undefined, true));
    case 'topCourses': {
      const entry = await cachedRead(key(days), TTL, () => getTopCoursesByViews(orgId, days, true));
      return { ...entry, data: entry.data.slice(0, limit) };
    }
    case 'loginActivity':
      return cachedRead(key(days), PUBLIC_API_LOGIN_ACTIVITY_TTL_SECONDS, () =>
        getStudentLoginActivity(orgId, days, true)
      );
  }
}

/**
 * Org analytics, one cached read per requested section. Mirrors `orgTeamMemberMiddleware`; admin-only sections
 * (login activity, as on the dashboard) are left out for tutors and listed in `meta.omitted`.
 */
export async function getPublicApiOrgAnalyticsService(
  orgId: string,
  actorId: string | null,
  query: TPublicApiOrgAnalyticsQuery
) {
  const roleId = await assertOrgTeamMember(orgId, actorId);

  const include = [...new Set(query.include)];
  const allowed = roleId === ROLE.ADMIN ? include : include.filter((section) => !ADMIN_ONLY_SECTIONS.has(section));
  const omitted = include
    .filter((section) => !allowed.includes(section))
    .map((section) => ({ section, reason: 'requires_org_admin' as const }));

  const entries = await Promise.all(allowed.map((section) => readSection(orgId, section, query.days, query.limit)));

  return {
    data: Object.fromEntries(allowed.map((section, index) => [section, entries[index].data])),
    meta: {
      include,
      days: query.days,
      limit: query.limit,
      omitted,
      generatedAt: entries.map((entry) => entry.generatedAt).sort()[0] ?? null
    }
  };
}
