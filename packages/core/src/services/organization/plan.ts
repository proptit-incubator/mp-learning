import type { DbOrTxClient } from '@cio/db/drizzle';
import { getActiveOrganizationPlan } from '@cio/db/queries/organization';
import { PLAN } from '@cio/utils/plans';
import type { TPlan } from '@cio/db/types';

import { env } from '../../config/env';

/**
 * The plan an organization's features are gated by. A self-hosted deployment has no billing, so every organization on
 * it gets Enterprise whatever plan row it carries; elsewhere the active plan row decides, and no row means Basic.
 */
export async function getEffectiveOrgPlanName(orgId: string, dbClient?: DbOrTxClient): Promise<TPlan> {
  if (env.PUBLIC_IS_SELFHOSTED === 'true') return PLAN.ENTERPRISE as TPlan;

  const activePlan = await getActiveOrganizationPlan(orgId, dbClient);

  return (activePlan?.planName as TPlan | undefined) ?? (PLAN.BASIC as TPlan);
}
