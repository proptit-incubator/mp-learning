import * as schema from '@db/schema';

import { and, desc, eq } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import type { TOrganizationInvite } from '@db/types';

export type TLinkInviteRow = TOrganizationInvite & {
  organization: { id: string; name: string; siteName: string };
};

export async function setLinkInviteRevoked(
  organizationId: string,
  roleId: number,
  isRevoked: boolean,
  profileId: string,
  dbClient: DbOrTxClient = db
): Promise<TOrganizationInvite | null> {
  try {
    const [invite] = await dbClient
      .select({ id: schema.organizationInvite.id })
      .from(schema.organizationInvite)
      .where(
        and(
          eq(schema.organizationInvite.organizationId, organizationId),
          eq(schema.organizationInvite.type, 'LINK'),
          eq(schema.organizationInvite.roleId, roleId)
        )
      )
      .orderBy(desc(schema.organizationInvite.createdAt), desc(schema.organizationInvite.id))
      .limit(1);

    if (!invite) return null;

    const target = isRevoked
      ? and(
          eq(schema.organizationInvite.organizationId, organizationId),
          eq(schema.organizationInvite.type, 'LINK'),
          eq(schema.organizationInvite.roleId, roleId)
        )
      : eq(schema.organizationInvite.id, invite.id);
    const updatedRows = await dbClient
      .update(schema.organizationInvite)
      .set({
        isRevoked,
        revokedByProfileId: isRevoked ? profileId : null,
        revokedAt: isRevoked ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString()
      })
      .where(target)
      .returning();

    const updated = updatedRows.find((row) => row.id === invite.id);
    return updated ?? null;
  } catch (error) {
    console.error('setLinkInviteRevoked error:', error);
    throw new Error(`Failed to update link invite: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
