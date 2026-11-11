import { canUsePublicApi } from '@cio/utils/plans';

import { env } from '../../config/env';
import { getEffectiveOrgPlanName } from '../organization/plan';

export async function hasWebhookEntitlement(organizationId: string): Promise<boolean> {
  const planName = await getEffectiveOrgPlanName(organizationId);

  return canUsePublicApi(planName, env.PUBLIC_IS_SELFHOSTED === 'true');
}
