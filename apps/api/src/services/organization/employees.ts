import { createHash, randomBytes } from 'node:crypto';
import { auth } from '@cio/db/auth';
import { db, type DbOrTxClient } from '@cio/db/drizzle';
import {
  addEmployeeAudit,
  consumeEmployeeActivation,
  countEmployeeAdmins,
  createEmployeeCredentials,
  employeeLearningReport,
  employeeOptions,
  employeeImportConflicts,
  enrollEmployee,
  findEmployee,
  findEmployeeAccount,
  findEmployeeActivation,
  getEmployeeAccess,
  isInReportingLine,
  getEmployeeOrganizationLocale,
  getEmployeeAudit,
  insertEmployee,
  insertEmployeeMember,
  issueEmployeeActivation,
  listEmployees,
  lockEmployeeOrganization,
  revokeEmployeeActivations,
  revokeEmployeeSessions,
  updateEmployee,
  updateEmployeeMember,
  updateEmployeeProfile,
  resolveDepartmentId
} from '@cio/db/queries/organization';
import { markUserAndProfileEmailVerified } from '@cio/db/queries/auth';
import { sendEmail, buildEmailBranding, buildEmailFromName } from '@cio/email';
import { getOrganizationById } from '@cio/db/queries/organization';
import { getStudentEmailDeliveryLocale, getStudentEmailSendContext } from '@cio/core/services/email/localization';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { AppError, ErrorCodes } from '@api/utils/errors';
import type {
  CreateEmployee,
  EmployeeListQuery,
  EmployeeStatus,
  UpdateEmployee
} from '@cio/utils/validation/organization';
import { ZActivateEmployee, ZCreateEmployee, ZUpdateEmployee } from '@cio/utils/validation/organization';
import { employeeMembershipRoleId } from '@cio/utils/functions/employee-access';

function rejectEmployee(key: string, status = 400): never {
  throw new AppError(`employees.errors.${key}`, ErrorCodes.VALIDATION_ERROR, status);
}

function seesWholeDirectory(access: { canManagePeople: boolean; canAssignTraining: boolean }) {
  return access.canManagePeople || access.canAssignTraining;
}

/** People managers may change employees; training assigners and department managers may only read them. */
export async function requireEmployeeAccess(orgId: string, actorId: string, manage = false, client: DbOrTxClient = db) {
  const access = await getEmployeeAccess(orgId, actorId, client);
  const canRead = access && (seesWholeDirectory(access) || access.isManager);
  if (!access || (manage ? !access.canManagePeople : !canRead)) rejectEmployee('forbidden', 403);

  return access;
}

async function validateEmployeeFields(
  orgId: string,
  actorId: string,
  fields: UpdateEmployee,
  employeeId?: string,
  client: DbOrTxClient = db
) {
  const access = await requireEmployeeAccess(orgId, actorId, true, client);
  if (!access.canGrantRoles && fields.roles.length > 0) rejectEmployee('forbidden', 403);

  const options = await employeeOptions(orgId, client);
  if (fields.managerId && !options.managers.some((manager) => manager.id === fields.managerId))
    rejectEmployee('manager');

  if (fields.managerId === employeeId) rejectEmployee('manager');

  let managerId = fields.managerId;
  const visited = new Set<string>();
  while (managerId) {
    if (managerId === employeeId || visited.has(managerId)) rejectEmployee('manager');

    visited.add(managerId);
    const manager = await findEmployee(orgId, managerId, client);
    managerId = manager?.managerId ?? null;
  }
  return access;
}

function hasSameRoles(current: readonly string[], next: readonly string[]) {
  return current.length === next.length && current.every((role) => next.includes(role));
}

export async function getEmployees(orgId: string, actorId: string, query: EmployeeListQuery) {
  const access = await requireEmployeeAccess(orgId, actorId);
  const managerId = seesWholeDirectory(access) ? undefined : (access.employeeId ?? '');
  const roster = await listEmployees(orgId, query, managerId);
  return { ...roster, access };
}

export async function getEmployeeOptions(orgId: string, actorId: string) {
  const access = await requireEmployeeAccess(orgId, actorId);
  if (!seesWholeDirectory(access)) rejectEmployee('forbidden', 403);

  return employeeOptions(orgId);
}

export async function getEmployeeDetails(orgId: string, actorId: string, employeeId: string) {
  const access = await requireEmployeeAccess(orgId, actorId);
  const staff = await findEmployee(orgId, employeeId);
  if (!staff) rejectEmployee('missing', 404);

  const isReport = access.employeeId ? await isInReportingLine(access.employeeId, employeeId) : false;
  if (!seesWholeDirectory(access) && !isReport) rejectEmployee('forbidden', 403);

  const enrollments = await employeeLearningReport(orgId, employeeId);
  const audit = access.canManagePeople ? await getEmployeeAudit(employeeId) : [];
  return { employee: staff, enrollments, audit };
}

export async function createEmployee(orgId: string, actorId: string, input: CreateEmployee) {
  const fields = ZCreateEmployee.parse(input);
  const staff = await db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    await validateEmployeeFields(orgId, actorId, fields, undefined, tx);
    const conflicts = await employeeImportConflicts(orgId, [fields.employeeCode], [fields.email], tx);
    if (conflicts.employees.length) rejectEmployee('duplicate');

    const identity = await findEmployeeAccount(fields.email, orgId, tx);
    if (identity.member && identity.member.roleId !== employeeMembershipRoleId(fields.roles))
      rejectEmployee('existing_role');

    const profileId = identity.member?.profileId ?? null;
    const activatedAt =
      profileId && identity.account?.emailVerified && identity.member?.status === 'ACTIVE'
        ? new Date().toISOString()
        : null;
    const status = activatedAt ? 'ACTIVE' : 'DRAFT';
    const memberStatus = activatedAt ? 'ACTIVE' : 'DEACTIVATED';
    const roleId = employeeMembershipRoleId(fields.roles);
    const member =
      identity.member ??
      (await insertEmployeeMember({ organizationId: orgId, email: fields.email, roleId, status: memberStatus }, tx));
    if (identity.member && identity.member.status !== 'ACTIVE') rejectEmployee('existing_account');

    const values = {
      organizationId: orgId,
      memberId: member.id,
      employeeCode: fields.employeeCode,
      fullname: fields.fullname,
      email: fields.email,
      departmentId: await resolveDepartmentId(orgId, fields.department, tx),
      jobTitle: fields.jobTitle,
      managerId: fields.managerId,
      roles: fields.roles,
      status,
      startDate: fields.startDate || null,
      activatedAt
    };
    const created = await insertEmployee(values, tx);
    if (profileId && activatedAt) {
      await updateEmployeeProfile(profileId, fields.fullname, tx);
      await enrollEmployee(created.id, tx);
    }
    await addEmployeeAudit(created.id, actorId, 'CREATED', '', tx);
    return created;
  });
  const delivery =
    fields.sendActivation && !staff.activatedAt ? await sendEmployeeActivation(orgId, actorId, staff.id) : null;
  const employee = await findEmployee(orgId, staff.id);
  return { employee: employee!, delivery };
}

export async function editEmployee(orgId: string, actorId: string, employeeId: string, input: UpdateEmployee) {
  const fields = ZUpdateEmployee.parse(input);
  const result = await db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    const access = await validateEmployeeFields(orgId, actorId, fields, employeeId, tx);
    const staff = await findEmployee(orgId, employeeId, tx);
    if (!staff) rejectEmployee('missing', 404);

    if (!access.canGrantRoles && staff.roles.length > 0) rejectEmployee('forbidden', 403);

    const identity = await findEmployeeAccount(staff.email, orgId, tx);
    const rolesChanged = !hasSameRoles(staff.roles, fields.roles);
    if (rolesChanged && identity.member?.profileId === actorId) rejectEmployee('self');

    const losesAdmin = identity.member?.roleId === 1 && !fields.roles.includes('ADMIN');
    if (losesAdmin && (await countEmployeeAdmins(orgId, tx)) <= 1) rejectEmployee('last_admin');

    const values = {
      fullname: fields.fullname,
      departmentId: await resolveDepartmentId(orgId, fields.department, tx),
      jobTitle: fields.jobTitle,
      managerId: fields.managerId,
      roles: fields.roles,
      startDate: fields.startDate || null
    };
    const updated = await updateEmployee(employeeId, values, tx);
    const roleId = employeeMembershipRoleId(fields.roles);
    await updateEmployeeMember(staff.memberId, { roleId }, tx);
    if (identity.member?.profileId) {
      await updateEmployeeProfile(identity.member.profileId, fields.fullname, tx);
      await enrollEmployee(employeeId, tx);
      if (rolesChanged) await revokeEmployeeSessions(identity.member.profileId, tx);
    }
    await addEmployeeAudit(employeeId, actorId, 'UPDATED', '', tx);
    return findEmployee(orgId, updated.id, tx);
  });
  return result!;
}

export async function setEmployeeStatus(
  orgId: string,
  actorId: string,
  employeeId: string,
  status: EmployeeStatus,
  reason: string
) {
  return db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    const access = await requireEmployeeAccess(orgId, actorId, true, tx);
    const staff = await findEmployee(orgId, employeeId, tx);
    if (!staff) rejectEmployee('missing', 404);

    if (!access.canGrantRoles && staff.roles.length > 0) rejectEmployee('forbidden', 403);

    const identity = await findEmployeeAccount(staff.email, orgId, tx);
    if (identity.member?.profileId === actorId) rejectEmployee('self');

    if (identity.member?.roleId === 1 && status !== 'ACTIVE' && (await countEmployeeAdmins(orgId, tx)) <= 1)
      rejectEmployee('last_admin');

    const nextStatus = status === 'ACTIVE' && !staff.activatedAt ? 'DRAFT' : status;
    const leftAt = nextStatus === 'LEFT' ? new Date().toISOString() : null;
    const updated = await updateEmployee(employeeId, { status: nextStatus, leftAt }, tx);
    const memberStatus = nextStatus === 'ACTIVE' ? 'ACTIVE' : nextStatus === 'LEFT' ? 'ARCHIVED' : 'DEACTIVATED';
    const statusChangedAt = new Date().toISOString();
    await updateEmployeeMember(staff.memberId, { status: memberStatus, statusChangedAt, statusChangedBy: actorId }, tx);
    await revokeEmployeeActivations(employeeId, tx);
    if (identity.member?.profileId) await revokeEmployeeSessions(identity.member.profileId, tx);
    const action = nextStatus === 'DRAFT' ? 'RESTORED_DRAFT' : nextStatus;
    await addEmployeeAudit(employeeId, actorId, action, reason, tx);
    return findEmployee(orgId, updated.id, tx);
  });
}

export function hashEmployeeToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function sendEmployeeActivation(orgId: string, actorId: string, employeeId: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashEmployeeToken(token);
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const staff = await db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    const access = await requireEmployeeAccess(orgId, actorId, true, tx);
    const employeeRow = await findEmployee(orgId, employeeId, tx);
    if (!employeeRow) rejectEmployee('missing', 404);

    if (!access.canGrantRoles && employeeRow.roles.length > 0) rejectEmployee('forbidden', 403);

    if (employeeRow.activatedAt || !['DRAFT', 'INVITED'].includes(employeeRow.status)) rejectEmployee('activation');

    await issueEmployeeActivation(employeeId, tokenHash, expiresAt, tx);
    return employeeRow;
  });
  const activationUrl = new URL('/activate', getDashboardBaseUrl());
  activationUrl.searchParams.set('token', token);
  const organization = await getOrganizationById(orgId);
  if (!organization) rejectEmployee('missing', 404);

  const locale = await getStudentEmailDeliveryLocale(orgId, 'employeeActivation');
  const context = await getStudentEmailSendContext(orgId, 'employeeActivation', locale);
  const branding = buildEmailBranding(organization);
  const from = buildEmailFromName(organization.name);
  const expiryLabel = new Intl.DateTimeFormat(context.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date(expiresAt));
  const results = await sendEmail('employeeActivation', {
    to: staff.email,
    from,
    locale: context.locale,
    contentOverride: context.templateOverride?.content,
    subjectOverride: context.templateOverride?.subject ?? undefined,
    fields: {
      orgName: organization.name,
      employeeName: staff.fullname,
      employeeCode: staff.employeeCode,
      expiresAt: expiryLabel,
      activationUrl: activationUrl.href,
      branding
    }
  });
  const sent = results.length > 0 && results.every((result) => result.success);
  await db.transaction(async (tx) => {
    await lockEmployeeOrganization(orgId, tx);
    const latest = await findEmployee(orgId, employeeId, tx);
    if (sent && latest && ['DRAFT', 'INVITED'].includes(latest.status)) {
      const invitationSentAt = new Date().toISOString();
      await updateEmployee(employeeId, { status: 'INVITED', invitationSentAt }, tx);
    }
    await addEmployeeAudit(employeeId, actorId, sent ? 'ACTIVATION_SENT' : 'EMAIL_FAILED', '', tx);
  });
  return { sent };
}

export async function previewEmployeeActivation(token: string) {
  const tokenHash = hashEmployeeToken(token);
  const staff = await findEmployeeActivation(tokenHash);
  if (!staff || !['DRAFT', 'INVITED'].includes(staff.status) || staff.activatedAt) rejectEmployee('activation');

  const identity = await findEmployeeAccount(staff.email, staff.organizationId);
  return { fullname: staff.fullname, employeeCode: staff.employeeCode, hasAccount: !!identity.account };
}

export async function activateEmployee(token: string, password?: string) {
  ZActivateEmployee.parse({ token, password });
  const tokenHash = hashEmployeeToken(token);
  const context = await auth.$context;
  const passwordHash = password ? await context.password.hash(password) : null;
  const staff = await db.transaction(async (tx) => {
    const preview = await findEmployeeActivation(tokenHash, tx);
    if (!preview) rejectEmployee('activation');

    await lockEmployeeOrganization(preview.organizationId, tx);
    const activation = await consumeEmployeeActivation(tokenHash, tx);
    if (!activation) rejectEmployee('activation');

    const employeeRow = await findEmployee(preview.organizationId, activation.employeeId, tx);
    if (!employeeRow || employeeRow.activatedAt || !['DRAFT', 'INVITED'].includes(employeeRow.status))
      rejectEmployee('activation');

    const identity = await findEmployeeAccount(employeeRow.email, employeeRow.organizationId, tx);
    if (!identity.account && !passwordHash) rejectEmployee('password');

    const language = await getEmployeeOrganizationLocale(employeeRow.organizationId, tx);
    const profileId =
      identity.account?.id ??
      (await createEmployeeCredentials(employeeRow.email, employeeRow.fullname, passwordHash!, tx, language));
    await markUserAndProfileEmailVerified(profileId, tx);
    const activatedAt = new Date().toISOString();
    const roleId = employeeMembershipRoleId(employeeRow.roles);
    await updateEmployeeMember(employeeRow.memberId, { profileId, verified: true, status: 'ACTIVE', roleId }, tx);
    await updateEmployee(employeeRow.id, { activatedAt, status: 'ACTIVE' }, tx);
    await enrollEmployee(employeeRow.id, tx);
    await addEmployeeAudit(employeeRow.id, profileId, 'ACTIVATED', '', tx);
    return employeeRow;
  });
  return { employeeCode: staff.employeeCode };
}

export async function importEmployees(orgId: string, actorId: string, rows: unknown[], preview: boolean) {
  const access = await requireEmployeeAccess(orgId, actorId, true);
  const options = await employeeOptions(orgId);
  const parsedRows = rows.map((row) => ZCreateEmployee.safeParse(row));
  const candidates = parsedRows.flatMap((row) => (row.success ? [row.data] : []));
  const codes = candidates.map((row) => row.employeeCode);
  const emails = candidates.map((row) => row.email);
  const conflicts = await employeeImportConflicts(orgId, codes, emails);
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  const result: Array<{
    row: number;
    employeeCode: string;
    success: boolean;
    message: string;
    emailSent: boolean | null;
  }> = [];
  for (let index = 0; index < rows.length; index++) {
    const parsed = parsedRows[index];
    if (!parsed.success) {
      const message = 'employees.errors.fields';
      result.push({ row: index + 2, employeeCode: '', success: false, message, emailSent: null });
      continue;
    }

    const fields = parsed.data;
    try {
      const source = rows[index];
      const managerCode =
        typeof source === 'object' && source && 'managerCode' in source && typeof source.managerCode === 'string'
          ? source.managerCode.trim().toUpperCase()
          : '';
      if (managerCode) {
        const manager = options.managers.find((candidate) => candidate.employeeCode === managerCode);
        if (!manager) rejectEmployee('manager');

        fields.managerId = manager.id;
      }
      if (seenCodes.has(fields.employeeCode) || seenEmails.has(fields.email)) rejectEmployee('duplicate');

      seenCodes.add(fields.employeeCode);
      seenEmails.add(fields.email);
      if (!access.canGrantRoles && fields.roles.length > 0) rejectEmployee('forbidden', 403);

      if (fields.managerId && !options.managers.some((manager) => manager.id === fields.managerId))
        rejectEmployee('manager');

      if (
        conflicts.employees.some(
          (employee) => employee.employeeCode === fields.employeeCode || employee.email === fields.email
        )
      )
        rejectEmployee('duplicate');

      const existingMember = conflicts.members.find((member) => member.email === fields.email);
      if (existingMember && existingMember.roleId !== employeeMembershipRoleId(fields.roles))
        rejectEmployee('existing_role');

      if (existingMember && existingMember.status !== 'ACTIVE') rejectEmployee('existing_account');

      const created = preview ? null : await createEmployee(orgId, actorId, fields);
      const emailSent = created?.delivery?.sent ?? null;
      result.push({ row: index + 2, employeeCode: fields.employeeCode, success: true, message: '', emailSent });
    } catch (error) {
      console.error('importEmployees row error:', { row: index + 2, error });
      const message = error instanceof AppError ? error.message : 'employees.errors.duplicate';
      result.push({ row: index + 2, employeeCode: fields.employeeCode, success: false, message, emailSent: null });
    }
  }
  return { preview, rows: result };
}
