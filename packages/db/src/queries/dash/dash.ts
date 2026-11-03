import { analyticsLoginEvents, and, db, desc, eq, gte, organizationmember, sql } from '@db/drizzle';

import { ROLE } from '@cio/utils/constants';

/**
 * Returns login counts grouped by day-of-week (0 = Sunday … 6 = Saturday) for
 * students of the given organization over the last `days` days.
 *
 * Each row in analytics_login_events is already one-per-user-per-day, so the
 * counts represent distinct active students per weekday — the chart shows
 * "most active day," not raw login volume.
 */
export function getOrgStudentLoginsByDayOfWeek(orgId: string, days: number) {
  const since = sql`CURRENT_DATE - ${sql.raw(`${days}`)}::int`;

  return db
    .select({
      dayOfWeek: sql<number>`EXTRACT(DOW FROM ${analyticsLoginEvents.loggedInDate})::int`.as('day_of_week'),
      count: sql<number>`COUNT(*)::int`.as('count')
    })
    .from(analyticsLoginEvents)
    .innerJoin(organizationmember, eq(organizationmember.profileId, analyticsLoginEvents.userId))
    .where(
      and(
        eq(organizationmember.organizationId, orgId),
        eq(organizationmember.roleId, ROLE.STUDENT),
        gte(analyticsLoginEvents.loggedInDate, since)
      )
    )
    .groupBy(sql`day_of_week`)
    .orderBy(sql`day_of_week`);
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getUserLoginStreak(userId: string) {
  const rows = await db
    .select({
      loggedInDate: analyticsLoginEvents.loggedInDate
    })
    .from(analyticsLoginEvents)
    .where(eq(analyticsLoginEvents.userId, userId))
    .orderBy(desc(analyticsLoginEvents.loggedInDate))
    .limit(90);

  const loggedInDates = new Set(rows.map((row) => row.loggedInDate));
  const cursorDate = new Date();

  if (!loggedInDates.has(getDateKey(cursorDate))) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  let daysActive = 0;
  while (loggedInDates.has(getDateKey(cursorDate))) {
    daysActive += 1;
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  return { daysActive };
}
