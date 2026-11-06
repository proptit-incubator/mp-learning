import { sql, type SQL } from 'drizzle-orm';

import { db } from '@db/drizzle';

export interface PracticeStatsFilter {
  profileId?: string;
  since?: string | null;
}

export type PracticeStatsTotals = {
  callCount: number;
  scoredCount: number;
  reviewedCount: number;
  learnerCount: number;
  averageScore: number | null;
  bestScore: number | null;
  totalSeconds: number;
};

export type PracticeScoreBucketRow = { bucket: number; count: number };

export type PracticeDailyCallRow = { date: string; calls: number; averageScore: number | null };

export type PracticeCriterionAverageRow = { name: string; averageScore: number; count: number };

export type PracticeLearnerStatsRow = {
  profileId: string;
  fullname: string;
  email: string | null;
  callCount: number;
  averageScore: number | null;
  bestScore: number | null;
  totalSeconds: number;
  lastCallAt: string;
};

export type PracticeScorePointRow = { callId: string; startedAt: string; score: number };

const EFFECTIVE_SCORE = sql.raw('COALESCE(pc.review_score, pc.score)');

function endedCallsWhere(orgId: string, filter: PracticeStatsFilter): SQL {
  const conditions = [sql`pc.organization_id = ${orgId}`, sql`pc.status = 'ENDED'`];
  if (filter.profileId) conditions.push(sql`pc.profile_id = ${filter.profileId}`);
  if (filter.since) conditions.push(sql`pc.started_at >= ${filter.since}`);

  return sql.join(conditions, sql` AND `);
}

/** Totals over ended calls; scores prefer the trainer's review score over the AI score. */
export async function getPracticeStatsTotals(orgId: string, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeStatsTotals>(sql`
      SELECT COUNT(*)::int AS "callCount",
        COUNT(${EFFECTIVE_SCORE})::int AS "scoredCount",
        COUNT(pc.reviewed_at)::int AS "reviewedCount",
        COUNT(DISTINCT pc.profile_id)::int AS "learnerCount",
        ROUND(AVG(${EFFECTIVE_SCORE}))::int AS "averageScore",
        MAX(${EFFECTIVE_SCORE})::int AS "bestScore",
        COALESCE(SUM(pc.duration_seconds), 0)::int AS "totalSeconds"
      FROM practice_call pc
      WHERE ${endedCallsWhere(orgId, filter)}
    `);

    return rows[0];
  } catch (error) {
    console.error('getPracticeStatsTotals error:', error);
    throw new Error('Failed to get practice stats');
  }
}

/** Scored calls counted per 10-point bucket (0 = 0–9 … 9 = 90–100). */
export async function listPracticeScoreBuckets(orgId: string, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeScoreBucketRow>(sql`
      SELECT LEAST(${EFFECTIVE_SCORE} / 10, 9)::int AS bucket, COUNT(*)::int AS count
      FROM practice_call pc
      WHERE ${endedCallsWhere(orgId, filter)} AND ${EFFECTIVE_SCORE} IS NOT NULL
      GROUP BY 1
      ORDER BY 1
    `);

    return [...rows];
  } catch (error) {
    console.error('listPracticeScoreBuckets error:', error);
    throw new Error('Failed to get practice score distribution');
  }
}

/** One row per Vietnam-time day for the last `days` days, including days without calls. */
export async function listPracticeDailyCalls(orgId: string, days: number, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeDailyCallRow>(sql`
      WITH boundaries AS (
        SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today
      ),
      calls AS (
        SELECT (pc.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS day, ${EFFECTIVE_SCORE} AS score
        FROM practice_call pc
        WHERE ${endedCallsWhere(orgId, filter)}
      )
      SELECT to_char(b.today - (${days}::int - 1) + day_index, 'YYYY-MM-DD') AS date,
        COUNT(c.day)::int AS calls,
        ROUND(AVG(c.score))::int AS "averageScore"
      FROM boundaries b
      CROSS JOIN generate_series(0, ${days}::int - 1) AS day_index
      LEFT JOIN calls c ON c.day = b.today - (${days}::int - 1) + day_index
      GROUP BY b.today, day_index
      ORDER BY day_index
    `);

    return [...rows];
  } catch (error) {
    console.error('listPracticeDailyCalls error:', error);
    throw new Error('Failed to get practice activity');
  }
}

/** Average AI criterion score (0–10) per criterion name, most-graded first. */
export async function listPracticeCriterionAverages(orgId: string, limit: number, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeCriterionAverageRow>(sql`
      SELECT btrim(criterion->>'name') AS name,
        ROUND(AVG((criterion->>'score')::numeric), 1)::float AS "averageScore",
        COUNT(*)::int AS count
      FROM practice_call pc
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(pc.feedback->'criteria', '[]'::jsonb)) AS criterion
      WHERE ${endedCallsWhere(orgId, filter)}
        AND btrim(COALESCE(criterion->>'name', '')) <> ''
        AND jsonb_typeof(criterion->'score') = 'number'
      GROUP BY 1
      ORDER BY count DESC, name
      LIMIT ${limit}
    `);

    return [...rows];
  } catch (error) {
    console.error('listPracticeCriterionAverages error:', error);
    throw new Error('Failed to get practice criteria stats');
  }
}

export async function listPracticeLearnerStats(orgId: string, limit: number, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeLearnerStatsRow>(sql`
      SELECT pc.profile_id AS "profileId", p.fullname, p.email,
        COUNT(*)::int AS "callCount",
        ROUND(AVG(${EFFECTIVE_SCORE}))::int AS "averageScore",
        MAX(${EFFECTIVE_SCORE})::int AS "bestScore",
        COALESCE(SUM(pc.duration_seconds), 0)::int AS "totalSeconds",
        MAX(pc.started_at) AS "lastCallAt"
      FROM practice_call pc
      JOIN profile p ON p.id = pc.profile_id
      WHERE ${endedCallsWhere(orgId, filter)}
      GROUP BY pc.profile_id, p.fullname, p.email
      ORDER BY "averageScore" DESC NULLS LAST, "callCount" DESC
      LIMIT ${limit}
    `);

    return [...rows];
  } catch (error) {
    console.error('listPracticeLearnerStats error:', error);
    throw new Error('Failed to get practice learner stats');
  }
}

/** The latest `limit` scored calls, oldest first, for a score trend. */
export async function listRecentPracticeScores(orgId: string, limit: number, filter: PracticeStatsFilter = {}) {
  try {
    const rows = await db.execute<PracticeScorePointRow>(sql`
      SELECT * FROM (
        SELECT pc.id AS "callId", pc.started_at AS "startedAt", ${EFFECTIVE_SCORE}::int AS score
        FROM practice_call pc
        WHERE ${endedCallsWhere(orgId, filter)} AND ${EFFECTIVE_SCORE} IS NOT NULL
        ORDER BY pc.started_at DESC
        LIMIT ${limit}
      ) recent
      ORDER BY "startedAt"
    `);

    return [...rows];
  } catch (error) {
    console.error('listRecentPracticeScores error:', error);
    throw new Error('Failed to get practice score trend');
  }
}
