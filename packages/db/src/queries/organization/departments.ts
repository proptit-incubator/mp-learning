import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import { departmentNameKey, normalizeDepartmentName } from '@cio/utils/functions/department';

/**
 * The department ids for `names` in the organization, creating the ones that do not exist yet. Names that differ only
 * in case or spacing map to the same department. Blank names map to null.
 */
export async function resolveDepartmentIds(orgId: string, names: string[], client: DbOrTxClient = db) {
  const byKey = new Map<string, string>();
  for (const name of names) {
    const normalized = normalizeDepartmentName(name);
    if (normalized && !byKey.has(departmentNameKey(normalized))) byKey.set(departmentNameKey(normalized), normalized);
  }

  if (byKey.size) {
    await client
      .insert(schema.department)
      .values([...byKey].map(([nameKey, name]) => ({ organizationId: orgId, name, nameKey })))
      .onConflictDoNothing({ target: [schema.department.organizationId, schema.department.nameKey] });
  }
  const rows = byKey.size
    ? await client
        .select({ id: schema.department.id, nameKey: schema.department.nameKey })
        .from(schema.department)
        .where(and(eq(schema.department.organizationId, orgId), inArray(schema.department.nameKey, [...byKey.keys()])))
    : [];
  const idByKey = new Map(rows.map((row) => [row.nameKey, row.id]));

  return (name: string | null | undefined) => idByKey.get(departmentNameKey(name)) ?? null;
}

export async function resolveDepartmentId(orgId: string, name: string | null | undefined, client: DbOrTxClient = db) {
  const lookup = await resolveDepartmentIds(orgId, [name ?? ''], client);
  return lookup(name);
}

/** Departments with their active and total employee counts, sorted by name. */
export async function listDepartments(orgId: string, client: DbOrTxClient = db) {
  return client
    .select({
      id: schema.department.id,
      name: schema.department.name,
      activeEmployees: sql<number>`count(${schema.employee.id}) filter (where ${schema.employee.status} = 'ACTIVE')::int`,
      employees: sql<number>`count(${schema.employee.id})::int`
    })
    .from(schema.department)
    .leftJoin(schema.employee, eq(schema.employee.departmentId, schema.department.id))
    .where(eq(schema.department.organizationId, orgId))
    .groupBy(schema.department.id, schema.department.name)
    .orderBy(asc(schema.department.name));
}

export async function findDepartment(orgId: string, departmentId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select()
    .from(schema.department)
    .where(and(eq(schema.department.organizationId, orgId), eq(schema.department.id, departmentId)))
    .limit(1);
  return row ?? null;
}

/**
 * Renames a department. When another department already has the new name, its employees stay there and this
 * department's employees move into it, so renaming "Ke toan" to "Kế toán" also merges the two. Returns the id that
 * survives.
 */
export async function renameDepartment(orgId: string, departmentId: string, name: string, client: DbOrTxClient = db) {
  const normalized = normalizeDepartmentName(name);
  const nameKey = departmentNameKey(normalized);
  const [existing] = await client
    .select({ id: schema.department.id })
    .from(schema.department)
    .where(and(eq(schema.department.organizationId, orgId), eq(schema.department.nameKey, nameKey)))
    .limit(1);

  if (existing && existing.id !== departmentId) {
    await client
      .update(schema.employee)
      .set({ departmentId: existing.id })
      .where(and(eq(schema.employee.organizationId, orgId), eq(schema.employee.departmentId, departmentId)));
    await client
      .delete(schema.department)
      .where(and(eq(schema.department.organizationId, orgId), eq(schema.department.id, departmentId)));
    return existing.id;
  }

  await client
    .update(schema.department)
    .set({ name: normalized, nameKey })
    .where(and(eq(schema.department.organizationId, orgId), eq(schema.department.id, departmentId)));
  return departmentId;
}

/** Removes a department nobody belongs to. Returns false when employees still reference it. */
export async function deleteEmptyDepartment(orgId: string, departmentId: string, client: DbOrTxClient = db) {
  const deleted = await client
    .delete(schema.department)
    .where(
      and(
        eq(schema.department.organizationId, orgId),
        eq(schema.department.id, departmentId),
        sql`not exists (select 1 from ${schema.employee} where ${schema.employee.departmentId} = ${schema.department.id})`
      )
    )
    .returning({ id: schema.department.id });
  return deleted.length > 0;
}
