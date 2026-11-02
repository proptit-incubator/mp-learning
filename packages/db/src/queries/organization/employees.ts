import { listEmployeeEnrollments, listEmployeeFacets, materializeEnrollmentMemberships } from '../course/enrollment';
import { and, asc, count, eq, getTableColumns, gt, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import type { EmployeeListQuery } from '@cio/utils/validation/organization';
import { employeeLearningMemberIds } from './audience';

function employeeProfiles(client: DbOrTxClient) {
  const employeeColumns = getTableColumns(schema.employee);
  return client
    .select({ ...employeeColumns, avatarUrl: schema.profile.avatarUrl })
    .from(schema.employee)
    .leftJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .leftJoin(schema.profile, eq(schema.organizationmember.profileId, schema.profile.id));
}

export async function findEmployee(orgId: string, employeeId: string, client: DbOrTxClient = db) {
  const [row] = await employeeProfiles(client)
    .where(and(eq(schema.employee.organizationId, orgId), eq(schema.employee.id, employeeId)))
    .limit(1);
  return row ?? null;
}

export async function employeeImportConflicts(
  orgId: string,
  codes: string[],
  emails: string[],
  client: DbOrTxClient = db
) {
  const employees = await client
    .select({ employeeCode: schema.employee.employeeCode, email: schema.employee.email })
    .from(schema.employee)
    .where(
      and(
        eq(schema.employee.organizationId, orgId),
        or(inArray(schema.employee.employeeCode, codes), inArray(schema.employee.email, emails))
      )
    );
  const members = await client
    .select({
      email: schema.organizationmember.email,
      roleId: schema.organizationmember.roleId,
      status: schema.organizationmember.status
    })
    .from(schema.organizationmember)
    .where(and(eq(schema.organizationmember.organizationId, orgId), inArray(schema.organizationmember.email, emails)));
  return { employees, members };
}

export async function getEmployeeByIdentity(identity: string, client: DbOrTxClient = db) {
  const rows = await client
    .select({ employee: schema.employee, member: schema.organizationmember })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .where(
      or(
        eq(schema.employee.employeeCode, identity.trim().toUpperCase()),
        eq(schema.employee.email, identity.trim().toLowerCase())
      )
    )
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}

export async function canEmployeeSignIn(profileId: string, client: DbOrTxClient = db) {
  const rows = await client
    .select({ status: schema.employee.status, memberStatus: schema.organizationmember.status })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .where(eq(schema.organizationmember.profileId, profileId));
  return rows.every((row) => row.status === 'ACTIVE' && row.memberStatus === 'ACTIVE');
}

export async function getEmployeeAccess(orgId: string, profileId: string, client: DbOrTxClient = db) {
  const [membership] = await client
    .select()
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, orgId),
        eq(schema.organizationmember.profileId, profileId),
        eq(schema.organizationmember.status, 'ACTIVE')
      )
    )
    .limit(1);
  if (!membership) return null;

  const [staff] = await client
    .select()
    .from(schema.employee)
    .where(eq(schema.employee.memberId, membership.id))
    .limit(1);
  if (staff && staff.status !== 'ACTIVE') return null;

  const delegatedRole = staff && ['HR', 'MANAGER'].includes(staff.role) ? staff.role : 'EMPLOYEE';
  const role = membership.roleId === 1 ? 'ADMIN' : membership.roleId === 2 ? 'TUTOR' : delegatedRole;
  return { role, employeeId: staff?.id ?? null, canManage: role === 'ADMIN' || role === 'HR' };
}

/** Subquery of every employee id below `managerEmployeeId` in the reporting line, at any depth. */
export function reportingLineSql(managerEmployeeId: string) {
  return sql`(
    WITH RECURSIVE reports AS (
      SELECT id FROM employee WHERE manager_id = ${managerEmployeeId}
      UNION
      SELECT child.id FROM employee child JOIN reports parent ON child.manager_id = parent.id
    )
    SELECT id FROM reports
  )`;
}

export async function isInReportingLine(managerEmployeeId: string, employeeId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select({ id: schema.employee.id })
    .from(schema.employee)
    .where(
      and(eq(schema.employee.id, employeeId), sql`${schema.employee.id} IN ${reportingLineSql(managerEmployeeId)}`)
    )
    .limit(1);
  return Boolean(row);
}

export async function listEmployees(
  orgId: string,
  query: EmployeeListQuery,
  managerId?: string,
  client: DbOrTxClient = db
) {
  const filters = and(
    eq(schema.employee.organizationId, orgId),
    query.enrollment || query.completion || query.certificate
      ? inArray(schema.employee.memberId, employeeLearningMemberIds(orgId, query, client))
      : undefined,
    query.profileId
      ? sql`${schema.employee.memberId} in (select id from organizationmember where profile_id = ${query.profileId} and organization_id = ${orgId})`
      : undefined,
    managerId ? sql`${schema.employee.id} IN ${reportingLineSql(managerId)}` : undefined,
    query.department ? ilike(schema.employee.department, `%${query.department}%`) : undefined,
    query.jobTitle ? ilike(schema.employee.jobTitle, `%${query.jobTitle}%`) : undefined,
    query.status ? eq(schema.employee.status, query.status) : undefined,
    query.search
      ? or(
          ilike(schema.employee.fullname, `%${query.search}%`),
          ilike(schema.employee.employeeCode, `%${query.search}%`),
          ilike(schema.employee.email, `%${query.search}%`)
        )
      : undefined
  );
  const rows = await employeeProfiles(client)
    .where(filters)
    .orderBy(asc(schema.employee.employeeCode))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
  const [total] = await client.select({ value: count() }).from(schema.employee).where(filters);
  return { rows, total: total?.value ?? 0, page: query.page, limit: query.limit };
}

export async function employeeOptions(orgId: string, client: DbOrTxClient = db) {
  const managers = await client
    .select({ id: schema.employee.id, fullname: schema.employee.fullname, employeeCode: schema.employee.employeeCode })
    .from(schema.employee)
    .where(
      and(
        eq(schema.employee.organizationId, orgId),
        eq(schema.employee.status, 'ACTIVE'),
        inArray(schema.employee.role, ['MANAGER', 'HR', 'ADMIN'])
      )
    );
  const facets = await listEmployeeFacets(orgId, client);
  return { managers, ...facets };
}

export async function findEmployeeAccount(email: string, orgId: string, client: DbOrTxClient = db) {
  const [account] = await client.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  const [member] = await client
    .select()
    .from(schema.organizationmember)
    .where(and(eq(schema.organizationmember.organizationId, orgId), eq(schema.organizationmember.email, email)))
    .limit(1);
  return { account: account ?? null, member: member ?? null };
}

export async function insertEmployee(values: typeof schema.employee.$inferInsert, client: DbOrTxClient = db) {
  const [row] = await client.insert(schema.employee).values(values).returning();
  return row;
}

export async function insertEmployeeMember(
  values: typeof schema.organizationmember.$inferInsert,
  client: DbOrTxClient = db
) {
  const [row] = await client.insert(schema.organizationmember).values(values).returning();
  return row;
}

export async function updateEmployee(
  employeeId: string,
  values: Partial<typeof schema.employee.$inferInsert>,
  client: DbOrTxClient = db
) {
  const [row] = await client.update(schema.employee).set(values).where(eq(schema.employee.id, employeeId)).returning();
  return row;
}

export async function updateEmployeeMember(
  memberId: number,
  values: Partial<typeof schema.organizationmember.$inferInsert>,
  client: DbOrTxClient = db
) {
  const [row] = await client
    .update(schema.organizationmember)
    .set(values)
    .where(eq(schema.organizationmember.id, memberId))
    .returning();
  return row;
}

export async function updateEmployeeProfile(profileId: string, fullname: string, client: DbOrTxClient = db) {
  await client.update(schema.profile).set({ fullname }).where(eq(schema.profile.id, profileId));
  await client.update(schema.user).set({ name: fullname }).where(eq(schema.user.id, profileId));
}

export async function addEmployeeAudit(
  employeeId: string,
  actorId: string | null,
  action: string,
  reason = '',
  client: DbOrTxClient = db
) {
  await client.insert(schema.employeeAudit).values({ employeeId, actorId, action, reason });
}

export async function getEmployeeAudit(employeeId: string, client: DbOrTxClient = db) {
  return client
    .select({
      id: schema.employeeAudit.id,
      actorId: schema.employeeAudit.actorId,
      actorName: schema.profile.fullname,
      action: schema.employeeAudit.action,
      reason: schema.employeeAudit.reason,
      createdAt: schema.employeeAudit.createdAt
    })
    .from(schema.employeeAudit)
    .leftJoin(schema.profile, eq(schema.employeeAudit.actorId, schema.profile.id))
    .where(eq(schema.employeeAudit.employeeId, employeeId))
    .orderBy(sql`${schema.employeeAudit.createdAt} desc`)
    .limit(100);
}

/** Materializes course memberships for an employee once their account exists. */
export async function enrollEmployee(employeeId: string, client: DbOrTxClient = db) {
  await materializeEnrollmentMemberships({ employeeIds: [employeeId] }, client);
}

export async function issueEmployeeActivation(
  employeeId: string,
  tokenHash: string,
  expiresAt: string,
  client: DbOrTxClient = db
) {
  await revokeEmployeeActivations(employeeId, client);
  await client.insert(schema.employeeActivation).values({ employeeId, tokenHash, expiresAt });
}

export async function revokeEmployeeActivations(employeeId: string, client: DbOrTxClient = db) {
  const usedAt = new Date().toISOString();
  await client
    .update(schema.employeeActivation)
    .set({ usedAt })
    .where(and(eq(schema.employeeActivation.employeeId, employeeId), isNull(schema.employeeActivation.usedAt)));
}

export async function findEmployeeActivation(tokenHash: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select({ employee: schema.employee })
    .from(schema.employeeActivation)
    .innerJoin(schema.employee, eq(schema.employeeActivation.employeeId, schema.employee.id))
    .where(
      and(
        eq(schema.employeeActivation.tokenHash, tokenHash),
        isNull(schema.employeeActivation.usedAt),
        gt(schema.employeeActivation.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);
  return row?.employee ?? null;
}

export async function consumeEmployeeActivation(tokenHash: string, client: DbOrTxClient = db) {
  const now = new Date().toISOString();
  const [row] = await client
    .update(schema.employeeActivation)
    .set({ usedAt: now })
    .where(
      and(
        eq(schema.employeeActivation.tokenHash, tokenHash),
        isNull(schema.employeeActivation.usedAt),
        gt(schema.employeeActivation.expiresAt, now)
      )
    )
    .returning();
  return row ?? null;
}

export async function getEmployeeOrganizationLocale(orgId: string, client: DbOrTxClient = db) {
  const [organization] = await client
    .select({ settings: schema.organization.settings })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);
  return organization?.settings?.language?.locale ?? 'vi';
}

export async function createEmployeeCredentials(
  email: string,
  fullname: string,
  passwordHash: string,
  client: DbOrTxClient = db,
  language: (typeof schema.profile.$inferInsert)['locale'] = 'vi'
) {
  const [newUser] = await client.insert(schema.user).values({ email, name: fullname, emailVerified: true }).returning();
  await client
    .insert(schema.account)
    .values({ userId: newUser.id, accountId: newUser.id, providerId: 'credential', password: passwordHash });
  const verifiedAt = new Date().toISOString();
  await client.insert(schema.profile).values({
    id: newUser.id,
    email,
    fullname,
    username: newUser.id,
    isEmailVerified: true,
    verifiedAt,
    locale: language
  });
  return newUser.id;
}

export async function revokeEmployeeSessions(profileId: string, client: DbOrTxClient = db) {
  await client.delete(schema.session).where(eq(schema.session.userId, profileId));
}

export async function lockEmployeeOrganization(orgId: string, client: DbOrTxClient = db) {
  await client
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .for('update');
}

export async function countEmployeeAdmins(orgId: string, client: DbOrTxClient = db) {
  const [result] = await client
    .select({ value: count() })
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, orgId),
        eq(schema.organizationmember.roleId, 1),
        eq(schema.organizationmember.status, 'ACTIVE')
      )
    );
  return result?.value ?? 0;
}

export async function employeeLearningReport(orgId: string, employeeId: string, client: DbOrTxClient = db) {
  const employeeRow = await findEmployee(orgId, employeeId, client);
  if (!employeeRow) return [];

  return listEmployeeEnrollments(employeeId, client);
}
