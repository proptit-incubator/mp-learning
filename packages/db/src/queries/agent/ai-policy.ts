import { eq, sql } from 'drizzle-orm';

import * as schema from '@db/schema';
import { db } from '@db/drizzle';

type OrgSettings = NonNullable<typeof schema.organization.$inferSelect.settings>;
export type StoredAiPolicy = NonNullable<OrgSettings['ai']>;

export async function getOrgAiPolicy(orgId: string): Promise<StoredAiPolicy | null> {
  try {
    const [row] = await db
      .select({ settings: schema.organization.settings })
      .from(schema.organization)
      .where(eq(schema.organization.id, orgId))
      .limit(1);

    return row?.settings?.ai ?? null;
  } catch (error) {
    console.error('getOrgAiPolicy error:', error);
    throw new Error('Failed to fetch org AI policy');
  }
}

/** Replaces `settings.ai` without touching the other organization settings. */
export async function setOrgAiPolicy(orgId: string, policy: StoredAiPolicy): Promise<StoredAiPolicy | null> {
  try {
    const [row] = await db
      .update(schema.organization)
      .set({
        settings: sql`COALESCE(${schema.organization.settings}, '{}'::jsonb) || jsonb_build_object('ai', ${JSON.stringify(policy)}::jsonb)`
      })
      .where(eq(schema.organization.id, orgId))
      .returning({ settings: schema.organization.settings });

    return row?.settings?.ai ?? null;
  } catch (error) {
    console.error('setOrgAiPolicy error:', error);
    throw new Error('Failed to update org AI policy');
  }
}

/** The language course content is written in: the organization's enforced interface language, else Vietnamese. */
export async function getOrgContentLocale(orgId: string): Promise<'vi' | 'en'> {
  const [row] = await db
    .select({ settings: schema.organization.settings })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);

  return row?.settings?.language?.locale === 'en' ? 'en' : 'vi';
}
