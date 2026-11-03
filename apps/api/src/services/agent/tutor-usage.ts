import { STUDENT_TUTOR_APPROACHING_THRESHOLD, type AiTutorSettings } from '@cio/ai-assistant/tutor-config';
import {
  getCapStatusSummary,
  getLearnerCapEvents,
  getLearnerCourseBreakdown,
  getLearnerDailyUsage,
  getLearnerLeaderboard,
  getMonthlyTutorCount,
  incrementMonthlyTutorCount,
  recordCapEvent
} from '@cio/db/queries/agent';

import { AppError } from '@api/utils/errors';
import { getEffectiveAiTutorSettings } from './tutor-config';
import { enforceTokenBalance, getAiPolicy } from '@cio/core/services/agent/usage';

/** The organization's monthly tutor message allowance for each learner. */
async function getLearnerCap(orgId: string): Promise<number> {
  return (await getAiPolicy(orgId)).learnerMonthlyMessages;
}

function startOfCurrentMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfPreviousMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
}

function startOfLast90DaysUtc(): Date {
  const now = new Date();
  return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
}

export function resolveTutorPeriod(period: 'current' | 'previous' | 'last90'): { start: Date; end?: Date } {
  if (period === 'previous') {
    const start = startOfPreviousMonthUtc();
    const end = startOfCurrentMonthUtc();
    return { start, end };
  }

  if (period === 'last90') {
    return { start: startOfLast90DaysUtc() };
  }

  return { start: startOfCurrentMonthUtc() };
}

export interface TutorPolicyResult {
  settings: AiTutorSettings;
  messageCount: number;
  capRemaining: number;
}

/**
 * Order of checks (matches PRD §"Enforcement"):
 *   1. Workspace AI tutor toggle  (settings.enabled)
 *   2. Org pooled quota           (enforceTokenBalance)
 *   3. Per-learner monthly cap    (AI policy learnerMonthlyMessages)
 *
 * Each failure logs a cap event so admins can see why a learner was blocked.
 */
export async function enforceStudentTutorPolicy(
  orgId: string,
  courseId: string,
  userId: string
): Promise<TutorPolicyResult> {
  const settings = await getEffectiveAiTutorSettings(orgId, courseId);

  if (!settings.enabled) {
    await recordCapEvent({ orgId, userId, courseId, eventType: 'tutor_disabled' });
    throw new AppError('AI tutor is disabled for this workspace', 'AI_TUTOR_DISABLED', 403);
  }

  try {
    await enforceTokenBalance(orgId);
  } catch (error) {
    if (error instanceof AppError && error.code === 'TOKEN_LIMIT_REACHED') {
      await recordCapEvent({ orgId, userId, courseId, eventType: 'pool_exhausted' });
      throw new AppError('AI tutor is taking a break', 'POOL_EXHAUSTED', 429);
    }
    throw error;
  }

  const [monthly, cap] = await Promise.all([
    getMonthlyTutorCount(orgId, userId, startOfCurrentMonthUtc()),
    getLearnerCap(orgId)
  ]);

  if (monthly.messageCount >= cap) {
    if (!monthly.capHitAt) {
      await recordCapEvent({ orgId, userId, courseId, eventType: 'cap_reached' });
    }
    throw new AppError('AI tutor is taking a break', 'LEARNER_CAP_REACHED', 429);
  }

  return {
    settings,
    messageCount: monthly.messageCount,
    capRemaining: Math.max(0, cap - monthly.messageCount)
  };
}

export async function incrementStudentTutorCount(
  orgId: string,
  userId: string,
  courseId: string
): Promise<{ messageCount: number; capHit: boolean }> {
  const result = await incrementMonthlyTutorCount({
    orgId,
    userId,
    periodStart: startOfCurrentMonthUtc(),
    cap: await getLearnerCap(orgId)
  });

  if (result.capHit) {
    await recordCapEvent({ orgId, userId, courseId, eventType: 'cap_reached' });
  }

  return result;
}

export async function getStudentTutorStatus(
  orgId: string,
  courseId: string,
  userId: string
): Promise<{ enabled: boolean; cap: number; capRemaining: number; enforced: boolean }> {
  const [settings, monthly, cap] = await Promise.all([
    getEffectiveAiTutorSettings(orgId, courseId),
    getMonthlyTutorCount(orgId, userId, startOfCurrentMonthUtc()),
    getLearnerCap(orgId)
  ]);

  return {
    enabled: settings.enabled,
    cap,
    capRemaining: Math.max(0, cap - monthly.messageCount),
    enforced: true
  };
}

// ─── Admin reads (Fair-Use leaderboard + summary + per-learner detail) ───────

export interface AdminLeaderboardEntry {
  userId: string;
  fullname: string | null;
  email: string | null;
  avatarUrl: string | null;
  messageCount: number;
  tokens: number;
  capRemaining: number;
  capPct: number;
  status: 'under' | 'approaching' | 'at_cap';
  capHitAt: string | null;
  lastMessageAt: string | null;
}

export async function getTutorLearnerLeaderboard(
  orgId: string,
  params: {
    period: 'current' | 'previous' | 'last90';
    search?: string;
    sort?: 'messages' | 'tokens' | 'capPct';
    page?: number;
    limit?: number;
  }
): Promise<{ entries: AdminLeaderboardEntry[]; total: number; cap: number; periodStart: string }> {
  const { start, end } = resolveTutorPeriod(params.period);
  const cap = await getLearnerCap(orgId);
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const { rows, total } = await getLearnerLeaderboard(orgId, {
    periodStart: start,
    periodEnd: end,
    search: params.search,
    sort: params.sort,
    limit,
    offset: (page - 1) * limit
  });

  const entries: AdminLeaderboardEntry[] = rows.map((row) => {
    const messageCount = row.messageCount;
    const capPct = cap > 0 ? messageCount / cap : 1;
    const status: AdminLeaderboardEntry['status'] =
      messageCount >= cap ? 'at_cap' : capPct >= STUDENT_TUTOR_APPROACHING_THRESHOLD ? 'approaching' : 'under';

    return {
      userId: row.userId,
      fullname: row.fullname,
      email: row.email,
      avatarUrl: row.avatarUrl,
      messageCount,
      tokens: row.tokens,
      capRemaining: Math.max(0, cap - messageCount),
      capPct,
      status,
      capHitAt: row.capHitAt,
      lastMessageAt: row.lastMessageAt
    };
  });

  return { entries, total, cap, periodStart: start.toISOString() };
}

export async function getTutorCapStatusSummary(
  orgId: string,
  period: 'current' | 'previous' | 'last90' = 'current'
): Promise<{ atCap: number; approaching: number; totalActive: number; cap: number; periodStart: string }> {
  const { start } = resolveTutorPeriod(period);
  const cap = await getLearnerCap(orgId);
  const summary = await getCapStatusSummary(orgId, start, cap, STUDENT_TUTOR_APPROACHING_THRESHOLD);

  return { ...summary, cap, periodStart: start.toISOString() };
}

export interface AdminLearnerDetail {
  userId: string;
  cap: number;
  messageCount: number;
  capRemaining: number;
  status: AdminLeaderboardEntry['status'];
  dailyUsage: { date: string; messages: number; tokens: number }[];
  courseBreakdown: { courseId: string | null; courseTitle: string | null; tokens: number; messages: number }[];
  capEvents: { id: number; eventType: string; occurredAt: string; courseId: string | null }[];
  periodStart: string;
}

export async function getTutorLearnerDetail(
  orgId: string,
  userId: string,
  period: 'current' | 'previous' | 'last90' = 'current'
): Promise<AdminLearnerDetail> {
  const { start } = resolveTutorPeriod(period);
  const [monthly, cap] = await Promise.all([getMonthlyTutorCount(orgId, userId, start), getLearnerCap(orgId)]);
  const [dailyUsage, courseBreakdown, capEvents] = await Promise.all([
    getLearnerDailyUsage(orgId, userId, start),
    getLearnerCourseBreakdown(orgId, userId, start),
    getLearnerCapEvents(orgId, userId, start)
  ]);

  const capPct = cap > 0 ? monthly.messageCount / cap : 1;
  const status: AdminLeaderboardEntry['status'] =
    monthly.messageCount >= cap ? 'at_cap' : capPct >= STUDENT_TUTOR_APPROACHING_THRESHOLD ? 'approaching' : 'under';

  return {
    userId,
    cap,
    messageCount: monthly.messageCount,
    capRemaining: Math.max(0, cap - monthly.messageCount),
    status,
    dailyUsage,
    courseBreakdown,
    capEvents,
    periodStart: start.toISOString()
  };
}
