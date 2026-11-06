import {
  getPracticeStatsTotals,
  listPracticeCriterionAverages,
  listPracticeDailyCalls,
  listPracticeLearnerStats,
  listPracticeScoreBuckets,
  listRecentPracticeScores,
  type PracticeScoreBucketRow,
  type PracticeStatsFilter
} from '@cio/db/queries/practice';
import type { TPracticeStatsRange } from '@cio/utils/validation/practice';

const SCORE_BUCKET_COUNT = 10;
const CRITERIA_LIMIT = 8;
const LEARNER_LIMIT = 100;
const TREND_LIMIT = 12;
const MY_ACTIVITY_DAYS = 30;
const ALL_TIME_ACTIVITY_DAYS = 90;

const RANGE_DAYS: Record<TPracticeStatsRange, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Vietnam-time midnight `days - 1` days ago, so the range lines up with the daily activity rows. */
export function rangeStart(days: number, now: Date = new Date()): string {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const startOfDayUtc = Date.UTC(
    vietnamNow.getUTCFullYear(),
    vietnamNow.getUTCMonth(),
    vietnamNow.getUTCDate() - (days - 1)
  );

  return new Date(startOfDayUtc - VIETNAM_OFFSET_MS).toISOString();
}

function fillScoreBuckets(rows: PracticeScoreBucketRow[]): number[] {
  const counts = Array.from({ length: SCORE_BUCKET_COUNT }, () => 0);
  for (const row of rows) counts[row.bucket] = row.count;

  return counts;
}

/** The viewer's own practice summary across all their ended calls. */
export async function getMyPracticeStats(orgId: string, profileId: string) {
  const filter: PracticeStatsFilter = { profileId };

  const [totals, trend, criteria, activity] = await Promise.all([
    getPracticeStatsTotals(orgId, filter),
    listRecentPracticeScores(orgId, TREND_LIMIT, filter),
    listPracticeCriterionAverages(orgId, CRITERIA_LIMIT, filter),
    listPracticeDailyCalls(orgId, MY_ACTIVITY_DAYS, filter)
  ]);

  return { totals, trend, criteria, activity };
}

/** Organization-wide practice statistics for L&D over the requested range. */
export async function getOrganizationPracticeStats(orgId: string, range: TPracticeStatsRange) {
  const rangeDays = RANGE_DAYS[range];
  const since = rangeDays === null ? null : rangeStart(rangeDays);
  const activityDays = rangeDays ?? ALL_TIME_ACTIVITY_DAYS;
  const filter: PracticeStatsFilter = { since };

  const [totals, bucketRows, criteria, activity, learners] = await Promise.all([
    getPracticeStatsTotals(orgId, filter),
    listPracticeScoreBuckets(orgId, filter),
    listPracticeCriterionAverages(orgId, CRITERIA_LIMIT, filter),
    listPracticeDailyCalls(orgId, activityDays, filter),
    listPracticeLearnerStats(orgId, LEARNER_LIMIT, filter)
  ]);
  const scoreBuckets = fillScoreBuckets(bucketRows);

  return { range, totals, scoreBuckets, criteria, activity, learners };
}
