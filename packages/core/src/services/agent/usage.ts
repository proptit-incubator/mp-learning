import type { TokenBalance, TokenUsage } from '@cio/ai-assistant';
import { pickAnyConfiguredProvider } from '@cio/ai-assistant/providers';
import {
  aggregateTokenUsageByUser,
  countRequests,
  getDailyTokenUsageHistory,
  getMonthlyTokenUsage,
  getOrgAiPolicy,
  getOrgCreditBalance,
  getUserMonthlyTokenUsage,
  insertTokenUsageAndDrainCredits,
  setOrgAiPolicy,
  summarizePurchases,
  upsertCreditBalance
} from '@cio/db/queries/agent';
import type { UsageLeaderboardRow } from '@cio/db/queries/agent';
import { getActiveOrganizationPlan } from '@cio/db/queries/organization';
import { resolveAiPolicy, type TAiPolicy, type TAiPolicyUpdate } from '@cio/utils/validation/agent';

import { AppError } from '@cio/utils/errors';

function startOfCurrentMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
}

// ─── Model Cost Multipliers ───────────────────────────────────────────────────

// Blended multiplier vs Gemini 3.1 Flash Lite baseline ($0.50/1M blended at 80/20 input/output mix); unknown → 1×.
// gemini-2.5-flash kept for backward compat with historical usage records.
const MODEL_COST_MULTIPLIER: Record<string, number> = {
  'gemini-3.1-flash-lite': 1,
  'gemini-3.5-flash-lite': 1.48,
  'gemini-3.8-flash': 5.4,
  'gemini-2.5-flash': 1.5,
  'gpt-5.4-mini': 4,
  'claude-sonnet-4-6': 11,
  'claude-opus-5-5': 14.4,
  'claude-sonnet-5-5': 7.2,
  'claude-haiku-5-5': 0.36,
  'claude-haiku-4-5-20251001': 1.5,
  'kimi-k2.6': 1,
  // Non-LLM spend: billed as a flat charge via `recordFlatCostUnits`, so the
  // multiplier is never applied. Listed to keep this map a complete inventory.
  'supadata-youtube-captions': 1
};

function computeCostUnits(promptTokens: number, completionTokens: number, model: string): number {
  const baseMultiplier = MODEL_COST_MULTIPLIER[model] ?? 1;
  const hasLongHaikuPrompt = model === 'claude-haiku-5-5' && promptTokens > 100_000;
  const multiplier = hasLongHaikuPrompt ? baseMultiplier * 5 : baseMultiplier;
  // Google discounts Gemini 3.8 Flash by 50% through December 31, 2026 (https://ai.google.dev/gemini-api/docs/pricing).
  const hasFlashDiscount = model === 'gemini-3.8-flash' && Date.now() < Date.UTC(2027, 0, 1);
  const effectiveMultiplier = hasFlashDiscount ? multiplier / 2 : multiplier;

  return Math.round((promptTokens + completionTokens) * effectiveMultiplier);
}

/** AI runs only when the server has a provider key and `AI_ENABLED` is not `false`. */
export function isAiConfigured(): boolean {
  if (process.env.AI_ENABLED?.toLowerCase() === 'false') return false;

  return pickAnyConfiguredProvider() !== null;
}

export async function getAiPolicy(orgId: string): Promise<TAiPolicy> {
  return resolveAiPolicy(await getOrgAiPolicy(orgId));
}

export async function updateAiPolicy(orgId: string, patch: TAiPolicyUpdate): Promise<TAiPolicy> {
  const next = { ...(await getAiPolicy(orgId)), ...patch };
  const saved = await setOrgAiPolicy(orgId, next);
  if (!saved) throw new AppError('Organization not found', 'ORGANIZATION_NOT_FOUND', 404);

  return resolveAiPolicy(saved);
}

/** Refuses an AI call when the server has no AI or the organization switched it off. */
export async function assertAiEnabled(orgId: string): Promise<TAiPolicy> {
  if (!isAiConfigured()) throw new AppError('AI is not configured on this server', 'AI_NOT_CONFIGURED', 503);

  const policy = await getAiPolicy(orgId);
  if (!policy.enabled) throw new AppError('AI is turned off for this organization', 'AI_DISABLED', 403);

  return policy;
}

export async function getMonthlyUsage(orgId: string): Promise<number> {
  return getMonthlyTokenUsage(orgId, startOfCurrentMonth());
}

export async function getCreditBalance(orgId: string): Promise<number> {
  return getOrgCreditBalance(orgId);
}

/**
 * The organization's monthly budget. With `userId`, `remaining` is also capped by that person's own monthly limit
 * when the policy sets one, and `user` reports where they stand.
 */
export async function getTokenBalance(orgId: string, userId?: string): Promise<TokenBalance> {
  const [policy, monthlyUsage, creditBalance, userUsed] = await Promise.all([
    getAiPolicy(orgId),
    getMonthlyUsage(orgId),
    getCreditBalance(orgId),
    userId ? getUserMonthlyTokenUsage(orgId, userId, startOfCurrentMonth()) : Promise.resolve(0)
  ]);

  const orgRemaining = Math.max(0, policy.monthlyLimit - monthlyUsage) + creditBalance;
  const userLimit = userId ? policy.authorMonthlyLimit : null;
  const userRemaining = userLimit === null ? Infinity : Math.max(0, userLimit - userUsed);

  return {
    used: monthlyUsage,
    allowance: policy.monthlyLimit,
    creditBalance,
    remaining: Math.min(orgRemaining, userRemaining),
    ...(userId ? { user: { used: userUsed, limit: userLimit } } : {})
  };
}

/**
 * Throws when the organization's monthly budget is spent, or, with `userId`, when that person reached their own
 * monthly limit. Learners are limited by message count instead, so callers pass `userId` only for authors.
 */
export async function enforceTokenBalance(orgId: string, userId?: string): Promise<TokenBalance> {
  const balance = await getTokenBalance(orgId, userId);

  if (balance.used >= balance.allowance && balance.creditBalance <= 0) {
    throw new AppError('Token limit reached', 'TOKEN_LIMIT_REACHED', 429);
  }

  if (balance.remaining <= 0) {
    throw new AppError('Your monthly AI limit is reached', 'USER_AI_LIMIT_REACHED', 429);
  }

  return balance;
}

export function computePurchasedTokenOverflow(params: {
  allowance: number;
  monthlyUsageBefore: number;
  requestTokens: number;
}): number {
  const allowanceRemainingBefore = Math.max(0, params.allowance - params.monthlyUsageBefore);

  return Math.max(0, params.requestTokens - allowanceRemainingBefore);
}

/** Record token usage after an LLM call; drains purchased credits when usage exceeds plan allowance. */
export async function recordTokenUsage(
  orgId: string,
  userId: string,
  courseId: string | null,
  usage: TokenUsage,
  model: string
): Promise<void> {
  const costUnits = computeCostUnits(usage.promptTokens, usage.completionTokens, model);
  const { monthlyLimit: allowance } = await getAiPolicy(orgId);

  await insertTokenUsageAndDrainCredits({
    orgId,
    userId,
    courseId,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    costUnits,
    model,
    planAllowance: allowance,
    since: startOfCurrentMonth()
  });
}

/**
 * Record a flat, non-token charge (a paid provider call) against the org's AI
 * budget, draining purchased credits once the plan allowance is spent.
 *
 * `recordTokenUsage` cannot express this: it derives `costUnits` from
 * `promptTokens + completionTokens`, so routing a flat charge through it would
 * write fabricated token counts into `ai_token_usage`. Here both token columns
 * stay `0` and `cost_units` carries the charge — safe because every aggregation
 * reads `COALESCE(cost_units, prompt_tokens + completion_tokens)`.
 */
export async function recordFlatCostUnits(
  orgId: string,
  userId: string,
  courseId: string | null,
  costUnits: number,
  model: string
): Promise<void> {
  if (costUnits <= 0) {
    return;
  }

  const { monthlyLimit: allowance } = await getAiPolicy(orgId);

  await insertTokenUsageAndDrainCredits({
    orgId,
    userId,
    courseId,
    promptTokens: 0,
    completionTokens: 0,
    costUnits,
    model,
    planAllowance: allowance,
    since: startOfCurrentMonth()
  });
}

export async function getOrgPlanName(orgId: string): Promise<string> {
  const activePlan = await getActiveOrganizationPlan(orgId);

  return activePlan?.planName ?? 'BASIC';
}

export async function isOrgOnPaidPlan(orgId: string): Promise<boolean> {
  const planName = await getOrgPlanName(orgId);

  return planName !== 'BASIC';
}

// ─── Usage History ───────────────────────────────────────────────────────────

export interface DailyUsage {
  date: string;
  tokens: number;
}

export async function getUsageHistory(orgId: string): Promise<DailyUsage[]> {
  return getDailyTokenUsageHistory(orgId, startOfCurrentMonth());
}

export interface PurchasedSummary {
  totalPurchasedTokens: number;
  totalSpentCents: number;
  currency: 'USD';
  currentBalance: number;
  lastPurchaseAt: string | null;
}

export async function getPurchasedSummary(orgId: string): Promise<PurchasedSummary> {
  const [summary, currentBalance] = await Promise.all([summarizePurchases(orgId), getCreditBalance(orgId)]);

  return {
    totalPurchasedTokens: summary.totalPurchasedTokens,
    totalSpentCents: summary.totalSpentCents,
    currency: 'USD',
    currentBalance,
    lastPurchaseAt: summary.lastPurchaseAt
  };
}

export interface LeaderboardEntry {
  userId: string;
  fullname: string | null;
  email: string | null;
  avatarUrl: string | null;
  tokens: number;
  requests: number;
  favoriteModel: string | null;
  percentage: number;
}

export async function getTeamLeaderboard(orgId: string): Promise<{ entries: LeaderboardEntry[]; totalTokens: number }> {
  const rows: UsageLeaderboardRow[] = await aggregateTokenUsageByUser(orgId, startOfCurrentMonth());
  const totalTokens = rows.reduce((sum: number, row: UsageLeaderboardRow) => sum + row.tokens, 0);

  const entries: LeaderboardEntry[] = rows.map((row: UsageLeaderboardRow) => ({
    userId: row.userId,
    fullname: row.fullname,
    email: row.email,
    avatarUrl: row.avatarUrl,
    tokens: row.tokens,
    requests: row.requests,
    favoriteModel: row.favoriteModel,
    percentage: totalTokens > 0 ? row.tokens / totalTokens : 0
  }));

  return { entries, totalTokens };
}

export async function getDetailedUsage(orgId: string) {
  const start = startOfCurrentMonth();
  const [balance, history, requestsThisMonth] = await Promise.all([
    getTokenBalance(orgId),
    getDailyTokenUsageHistory(orgId, start),
    countRequests(orgId, start)
  ]);

  return { ...balance, history, requestsThisMonth };
}

// ─── Credit Purchases ────────────────────────────────────────────────────────

export async function addCredits(orgId: string, amount: number): Promise<number> {
  if (amount <= 0) {
    throw new AppError('Credit amount must be positive', 'INVALID_CREDIT_AMOUNT', 400);
  }

  return upsertCreditBalance(orgId, amount);
}
