import { createOrganizationInviteAudits, getActivePendingOrgInviteForEmail } from '@cio/db/queries/organization';
import { emitWebhookEvent } from '@cio/core/services/webhook/emit';

import { ROLE } from '@cio/utils/constants';
import type { TNewOrganizationInviteAudit } from '@db/types';

export function getRoleLabel(roleId: number): string {
  if (roleId === ROLE.ADMIN) return 'Admin';
  if (roleId === ROLE.TUTOR) return 'Tutor';
  if (roleId === ROLE.STUDENT) return 'Student';
  return `Role ${roleId}`;
}

const ORGANIZATION_INVITE_WEBHOOK_EVENTS: Partial<
  Record<
    TNewOrganizationInviteAudit['eventType'],
    'organization.invite.created' | 'organization.invite.accepted' | 'organization.invite.revoked'
  >
> = {
  CREATED: 'organization.invite.created',
  ACCEPTED: 'organization.invite.accepted',
  REVOKED: 'organization.invite.revoked'
};

export async function recordOrganizationInviteAudits(rows: TNewOrganizationInviteAudit[]) {
  await createOrganizationInviteAudits(rows);

  for (const row of rows) {
    const webhookEventType = ORGANIZATION_INVITE_WEBHOOK_EVENTS[row.eventType];

    if (!webhookEventType) continue;

    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const reason = typeof metadata.reason === 'string' ? metadata.reason : null;

    await emitWebhookEvent(row.organizationId, webhookEventType, {
      inviteId: row.inviteId,
      email: row.targetEmail ?? null,
      actorProfileId: row.actorProfileId ?? null,
      reason
    });
  }
}

/**
 * Returns the pending org invite for the currently logged-in user, if one exists.
 * Used by the LMS dashboard to prompt the student to accept on first load.
 */
export async function getPendingOrgInviteForUser(orgId: string, email: string) {
  if (!orgId || !email) {
    return null;
  }

  const data = await getActivePendingOrgInviteForEmail(orgId, email);

  if (!data) {
    return null;
  }

  return {
    id: data.invite.id,
    email: data.invite.email,
    roleId: data.invite.roleId,
    roleLabel: getRoleLabel(data.invite.roleId),
    expiresAt: data.invite.expiresAt,
    organization: data.organization
  };
}
