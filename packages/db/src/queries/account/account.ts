import * as schema from '@db/schema';

import { and, count, eq, inArray, isNull } from 'drizzle-orm';

import { db } from '@db/drizzle';

export type CreateSecondaryWorkspaceInput = {
  parentOrganizationId: string;
  name: string;
  siteName: string;
  ownerProfileId: string;
  ownerRoleId: number;
};

export async function setSecondariesReadOnlyUntil(primaryOrgId: string, until: Date): Promise<number> {
  try {
    const result = await db
      .update(schema.organization)
      .set({ readOnlyUntil: until.toISOString() })
      .where(eq(schema.organization.parentOrganizationId, primaryOrgId))
      .returning({ id: schema.organization.id });

    return result.length;
  } catch (error) {
    console.error('setSecondariesReadOnlyUntil error:', error);
    throw new Error(`Failed to set secondaries read-only: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function findAccountsOverAllowance(
  allowanceByPlan: Record<string, number>
): Promise<Array<{ primaryOrgId: string; planName: string | null; workspaceCount: number }>> {
  try {
    const primaries = await db
      .select({
        id: schema.organization.id,
        planName: schema.organizationPlan.planName
      })
      .from(schema.organization)
      .leftJoin(
        schema.organizationPlan,
        and(eq(schema.organization.id, schema.organizationPlan.orgId), eq(schema.organizationPlan.isActive, true))
      )
      .where(isNull(schema.organization.parentOrganizationId));

    if (primaries.length === 0) return [];

    const childCounts = await db
      .select({
        parentOrganizationId: schema.organization.parentOrganizationId,
        c: count()
      })
      .from(schema.organization)
      .where(
        inArray(
          schema.organization.parentOrganizationId,
          primaries.map((p) => p.id)
        )
      )
      .groupBy(schema.organization.parentOrganizationId);

    const childCountByParent = new Map<string, number>();
    for (const row of childCounts) {
      if (row.parentOrganizationId) childCountByParent.set(row.parentOrganizationId, row.c);
    }

    const offenders: Array<{ primaryOrgId: string; planName: string | null; workspaceCount: number }> = [];
    for (const primary of primaries) {
      const total = 1 + (childCountByParent.get(primary.id) ?? 0);
      const allowance = allowanceByPlan[primary.planName ?? ''] ?? 1;
      if (total > allowance) {
        offenders.push({ primaryOrgId: primary.id, planName: primary.planName, workspaceCount: total });
      }
    }

    return offenders;
  } catch (error) {
    console.error('findAccountsOverAllowance error:', error);
    throw new Error(
      `Failed to find accounts over allowance: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
