import { z } from 'zod';

const MAX_UNITS = 1_000_000_000;

/**
 * How an organization lets people use AI. Limits are monthly and counted in cost units: tokens weighted by the
 * model's price, so one unit is one token of the cheapest model.
 */
export const ZAiPolicy = z.object({
  enabled: z.boolean(),
  monthlyLimit: z.number().int().min(0).max(MAX_UNITS),
  authorMonthlyLimit: z.number().int().min(0).max(MAX_UNITS).nullable(),
  learnerMonthlyMessages: z.number().int().min(0).max(10_000)
});

export type TAiPolicy = z.infer<typeof ZAiPolicy>;

export const ZAiPolicyUpdate = ZAiPolicy.partial();
export type TAiPolicyUpdate = z.infer<typeof ZAiPolicyUpdate>;

export const DEFAULT_AI_POLICY: TAiPolicy = {
  enabled: true,
  monthlyLimit: 15_000_000,
  authorMonthlyLimit: 3_000_000,
  learnerMonthlyMessages: 100
};

export function resolveAiPolicy(stored: unknown): TAiPolicy {
  const parsed = ZAiPolicyUpdate.safeParse(stored ?? {});
  return { ...DEFAULT_AI_POLICY, ...(parsed.success ? parsed.data : {}) };
}
