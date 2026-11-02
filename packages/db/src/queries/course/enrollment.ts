import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';

export type EnrollmentKind = 'ASSIGNED' | 'SELF';
export type EnrollmentStatus = 'ACTIVE' | 'WAIVED' | 'REVOKED';
export type EnrollmentState = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'expired' | 'waived';

export const ENROLLMENT_STATES: EnrollmentState[] = [
  'not_started',
  'in_progress',
  'completed',
  'overdue',
  'expired',
  'waived'
];

/** Profile id behind an employee row; null until the employee activates their account. */
export function employeeProfileIdSql(employeeId: string | SQL) {
  return sql<string | null>`(select om.profile_id from employee ep join organizationmember om on om.id = ep.member_id
    where ep.id = ${employeeId})`;
}

/**
 * Whether `profileId` may learn `courseId`: an ACTIVE org member backed by an ACTIVE employee who holds
 * an unrevoked enrollment for the course. Staff and admins are handled elsewhere.
 */
export function learnerAccessSql(courseId: string | SQL, profileId: string | SQL) {
  return sql<boolean>`exists (
    select 1 from course_enrollment access_enrollment
    join employee access_employee on access_employee.id = access_enrollment.employee_id
    join organizationmember access_member on access_member.id = access_employee.member_id
    join course access_course on access_course.id = access_enrollment.course_id
    join "group" access_group on access_group.id = access_course.group_id
    where access_enrollment.course_id = ${courseId}
      and access_enrollment.status <> 'REVOKED'
      and access_employee.status = 'ACTIVE'
      and access_member.status = 'ACTIVE'
      and access_member.profile_id = ${profileId}
      and access_group.organization_id = access_employee.organization_id
  )`;
}

export function courseLearnerCountSql(courseId: string | SQL) {
  return sql<number>`(select count(distinct count_enrollment.employee_id)::int from course_enrollment count_enrollment
    join employee count_employee on count_employee.id = count_enrollment.employee_id
    where count_enrollment.course_id = ${courseId} and count_enrollment.status <> 'REVOKED'
      and count_employee.status = 'ACTIVE')`;
}

/**
 * Latest completion cycle for the learner behind an enrollment row aliased `alias`.
 * Yields `completed_at` and `valid_until` columns (both null when never completed).
 */
function latestCompletionSql(alias: string) {
  const a = sql.raw(alias);
  return sql`(select ccr.completed_at, ccr.valid_until from course_completion_record ccr
    where ccr.course_id = ${a}.course_id and ccr.profile_id = ${employeeProfileIdSql(sql`${a}.employee_id`)}
    order by ccr.cycle_number desc limit 1)`;
}

function hasProgressSql(alias: string) {
  const a = sql.raw(alias);
  const profile = employeeProfileIdSql(sql`${a}.employee_id`);
  return sql<boolean>`(exists (select 1 from lesson_completion plc join lesson pl on pl.id = plc.lesson_id
      where pl.course_id = ${a}.course_id and plc.profile_id = ${profile} and plc.is_complete = true)
    or exists (select 1 from submission ps join groupmember pgm on pgm.id = ps.submitted_by
      join course pc on pc.group_id = pgm.group_id
      where pc.id = ${a}.course_id and pgm.profile_id = ${profile}))`;
}

/**
 * Computed state of a `course_enrollment` row aliased `alias`, most decisive first:
 * waived → completed (valid) → overdue → expired → in_progress → not_started.
 */
export function enrollmentStateSql(alias = 'ce') {
  const a = sql.raw(alias);
  return sql<EnrollmentState>`(select case
    when ${a}.status = 'WAIVED' and (${a}.waiver_expires_at is null or ${a}.waiver_expires_at > now()) then 'waived'
    when latest.completed_at is not null and (latest.valid_until is null or latest.valid_until > now()) then 'completed'
    when ${a}.due_date is not null and ${a}.due_date < now() then 'overdue'
    when latest.completed_at is not null then 'expired'
    when ${hasProgressSql(alias)} then 'in_progress'
    else 'not_started' end
    from (select 1) one left join lateral ${latestCompletionSql(alias)} latest on true)`;
}

export function enrollmentValidUntilSql(alias = 'ce') {
  const a = sql.raw(alias);
  return sql<string | null>`(select ccr.valid_until from course_completion_record ccr
    where ccr.course_id = ${a}.course_id and ccr.profile_id = ${employeeProfileIdSql(sql`${a}.employee_id`)}
    order by ccr.cycle_number desc limit 1)`;
}

export async function ensureLearnerMembership(
  groupId: string,
  profileId: string,
  email: string | null,
  client: DbOrTxClient = db
) {
  const [inserted] = await client
    .insert(schema.groupmember)
    .values({ groupId, profileId, email: email ?? undefined, roleId: 3 })
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;

  const [member] = await client
    .select()
    .from(schema.groupmember)
    .where(and(eq(schema.groupmember.groupId, groupId), eq(schema.groupmember.profileId, profileId)));
  return member ?? null;
}

/** Creates `groupmember` learner rows for every activated employee holding a live enrollment in the courses. */
export async function materializeEnrollmentMemberships(
  filter: { courseIds?: string[]; employeeIds?: string[] },
  client: DbOrTxClient = db
) {
  if (filter.courseIds?.length === 0 || filter.employeeIds?.length === 0) return;

  const courseCondition = filter.courseIds ? inArray(sql`ce.course_id`, filter.courseIds) : sql`true`;
  const employeeCondition = filter.employeeIds ? inArray(sql`ce.employee_id`, filter.employeeIds) : sql`true`;
  await client.execute(sql`insert into groupmember (group_id, profile_id, email, role_id)
    select distinct co.group_id, om.profile_id, e.email, 3
    from course_enrollment ce
    join employee e on e.id = ce.employee_id
    join organizationmember om on om.id = e.member_id
    join course co on co.id = ce.course_id
    where ce.status <> 'REVOKED' and om.profile_id is not null and ${courseCondition} and ${employeeCondition}
      and not exists (select 1 from groupmember gm where gm.group_id = co.group_id and gm.profile_id = om.profile_id)
    on conflict do nothing`);
}

export type CreateEnrollmentsInput = {
  courseIds: string[];
  employeeIds: string[];
  kind: EnrollmentKind;
  assignedBy?: string | null;
  dueDate?: string | null;
  batchLabel?: string | null;
  message?: string;
};

/**
 * Inserts one enrollment per (course, employee) that has no live row of the same kind.
 * Returns the rows actually created; existing live enrollments are left untouched.
 */
export async function createEnrollments(input: CreateEnrollmentsInput, client: DbOrTxClient = db) {
  if (!input.courseIds.length || !input.employeeIds.length) return [];

  const values = input.courseIds.flatMap((courseId) =>
    input.employeeIds.map((employeeId) => ({
      courseId,
      employeeId,
      kind: input.kind,
      assignedBy: input.kind === 'ASSIGNED' ? (input.assignedBy ?? null) : null,
      dueDate: input.kind === 'ASSIGNED' ? (input.dueDate ?? null) : null,
      batchLabel: input.kind === 'ASSIGNED' ? input.batchLabel?.trim() || null : null,
      message: input.kind === 'ASSIGNED' ? (input.message ?? '') : ''
    }))
  );
  const created = await client.insert(schema.courseEnrollment).values(values).onConflictDoNothing().returning();
  if (created.length) {
    await materializeEnrollmentMemberships(
      {
        courseIds: [...new Set(created.map((row) => row.courseId))],
        employeeIds: [...new Set(created.map((row) => row.employeeId))]
      },
      client
    );
  }
  return created;
}

export async function getEnrollmentById(enrollmentId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select()
    .from(schema.courseEnrollment)
    .where(eq(schema.courseEnrollment.id, enrollmentId))
    .limit(1);
  return row ?? null;
}

export async function revokeEnrollment(enrollmentId: string, actorId: string | null, client: DbOrTxClient = db) {
  const now = new Date().toISOString();
  const [row] = await client
    .update(schema.courseEnrollment)
    .set({ status: 'REVOKED', revokedAt: now, revokedBy: actorId, updatedAt: now })
    .where(and(eq(schema.courseEnrollment.id, enrollmentId), sql`${schema.courseEnrollment.status} <> 'REVOKED'`))
    .returning();
  return row ?? null;
}

export async function waiveEnrollment(
  enrollmentId: string,
  input: { actorId: string; reason: string; expiresAt?: string | null },
  client: DbOrTxClient = db
) {
  const now = new Date().toISOString();
  const [row] = await client
    .update(schema.courseEnrollment)
    .set({
      status: 'WAIVED',
      waivedBy: input.actorId,
      waiverReason: input.reason,
      waiverExpiresAt: input.expiresAt ?? null,
      updatedAt: now
    })
    .where(and(eq(schema.courseEnrollment.id, enrollmentId), eq(schema.courseEnrollment.status, 'ACTIVE')))
    .returning();
  return row ?? null;
}

export async function updateEnrollmentDueDate(enrollmentId: string, dueDate: string | null, client: DbOrTxClient = db) {
  const [row] = await client
    .update(schema.courseEnrollment)
    .set({ dueDate, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(schema.courseEnrollment.id, enrollmentId),
        eq(schema.courseEnrollment.kind, 'ASSIGNED'),
        sql`${schema.courseEnrollment.status} <> 'REVOKED'`
      )
    )
    .returning();
  return row ?? null;
}

export type CourseEnrollmentRow = {
  id: string;
  courseId: string;
  employeeId: string;
  profileId: string | null;
  employeeCode: string;
  fullname: string;
  email: string;
  department: string;
  jobTitle: string;
  avatarUrl: string | null;
  kind: EnrollmentKind;
  status: EnrollmentStatus;
  state: EnrollmentState;
  assignedBy: string | null;
  assignedByName: string | null;
  dueDate: string | null;
  batchLabel: string | null;
  message: string;
  waiverReason: string | null;
  waiverExpiresAt: string | null;
  validUntil: string | null;
  createdAt: string;
};

const enrollmentRowSelect = sql`ce.id, ce.course_id "courseId", ce.employee_id "employeeId", om.profile_id "profileId",
  e.employee_code "employeeCode", e.fullname, e.email, e.department, e.job_title "jobTitle", pr.avatar_url "avatarUrl",
  ce.kind, ce.status, ${enrollmentStateSql('ce')} state, ce.assigned_by "assignedBy", actor.fullname "assignedByName",
  ce.due_date "dueDate", ce.batch_label "batchLabel", ce.message, ce.waiver_reason "waiverReason",
  ce.waiver_expires_at "waiverExpiresAt", ${enrollmentValidUntilSql('ce')} "validUntil", ce.created_at "createdAt"`;

const enrollmentRowFrom = sql`from course_enrollment ce
  join employee e on e.id = ce.employee_id
  join organizationmember om on om.id = e.member_id
  left join profile pr on pr.id = om.profile_id
  left join profile actor on actor.id = ce.assigned_by`;

function normalizeEnrollmentRow(row: CourseEnrollmentRow): CourseEnrollmentRow {
  const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);
  return {
    ...row,
    dueDate: iso(row.dueDate),
    waiverExpiresAt: iso(row.waiverExpiresAt),
    validUntil: iso(row.validUntil),
    createdAt: new Date(row.createdAt).toISOString()
  };
}

/** Live enrollments of a course, employees first by code; both kinds are returned so the UI can label them. */
export async function listCourseEnrollments(courseId: string, client: DbOrTxClient = db) {
  const rows = await client.execute<CourseEnrollmentRow>(sql`select ${enrollmentRowSelect} ${enrollmentRowFrom}
    where ce.course_id = ${courseId} and ce.status <> 'REVOKED'
    order by e.employee_code, ce.kind`);
  return rows.map(normalizeEnrollmentRow);
}

export type EmployeeEnrollmentRow = CourseEnrollmentRow & {
  courseTitle: string;
  isPublished: boolean;
  recertificationMonths: number | null;
  completedAt: string | null;
  score: number | null;
  progressPercent: number;
};

export async function listEmployeeEnrollments(employeeId: string, client: DbOrTxClient = db) {
  const profile = employeeProfileIdSql(sql`ce.employee_id`);
  const totalItems = sql`((select count(*) from lesson where course_id = ce.course_id)
    + (select count(*) from exercise ex left join lesson l on ex.lesson_id = l.id where ex.course_id = ce.course_id or l.course_id = ce.course_id))`;
  const completedItems = sql`((select count(*) from lesson_completion lc join lesson l on l.id = lc.lesson_id
      where l.course_id = ce.course_id and lc.profile_id = ${profile} and lc.is_complete = true)
    + (select count(distinct s.exercise_id) from submission s join exercise ex on ex.id = s.exercise_id
      left join lesson l on l.id = ex.lesson_id join groupmember gm on gm.id = s.submitted_by
      where (ex.course_id = ce.course_id or l.course_id = ce.course_id) and gm.profile_id = ${profile} and gm.group_id = co.group_id))`;
  const rows = await client.execute<EmployeeEnrollmentRow>(sql`select ${enrollmentRowSelect},
      co.title "courseTitle", coalesce(co.is_published, false) "isPublished", co.recertification_months "recertificationMonths",
      latest.completed_at "completedAt", latest.score,
      case when ${totalItems} > 0 then least(100, round(${completedItems} * 100.0 / ${totalItems}))::int else 0 end "progressPercent"
    ${enrollmentRowFrom}
    join course co on co.id = ce.course_id
    left join lateral (select ccr.completed_at, ccr.score from course_completion_record ccr
      where ccr.course_id = ce.course_id and ccr.profile_id = ${profile} order by ccr.cycle_number desc limit 1) latest on true
    where ce.employee_id = ${employeeId} and ce.status <> 'REVOKED' and co.status = 'ACTIVE'
    order by case ce.kind when 'ASSIGNED' then 0 else 1 end, ce.due_date nulls last, co.title`);
  return rows.map((row) => ({
    ...normalizeEnrollmentRow(row),
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null
  }));
}

export type LearnerEnrollmentSummary = {
  courseId: string;
  enrollmentId: string;
  kind: EnrollmentKind;
  status: EnrollmentStatus;
  state: EnrollmentState;
  dueDate: string | null;
  batchLabel: string | null;
  validUntil: string | null;
  message: string;
};

/**
 * One summary per course for a learner profile, preferring the assigned enrollment over a self-enrollment
 * so obligations are never hidden by a voluntary row.
 */
export async function getLearnerEnrollmentSummaries(profileId: string, courseIds: string[], client: DbOrTxClient = db) {
  if (!courseIds.length) return new Map<string, LearnerEnrollmentSummary>();

  const rows = await client.execute<LearnerEnrollmentSummary>(sql`select distinct on (ce.course_id)
      ce.course_id "courseId", ce.id "enrollmentId", ce.kind, ce.status, ${enrollmentStateSql('ce')} state,
      ce.due_date "dueDate", ce.batch_label "batchLabel", ${enrollmentValidUntilSql('ce')} "validUntil", ce.message
    from course_enrollment ce
    join employee e on e.id = ce.employee_id
    join organizationmember om on om.id = e.member_id
    where om.profile_id = ${profileId} and ce.status <> 'REVOKED' and ${inArray(sql`ce.course_id`, courseIds)}
    order by ce.course_id, case ce.kind when 'ASSIGNED' then 0 else 1 end, ce.created_at desc`);
  const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);
  return new Map(
    rows.map((row) => [
      row.courseId,
      { ...row, dueDate: iso(row.dueDate), validUntil: iso(row.validUntil) } satisfies LearnerEnrollmentSummary
    ])
  );
}

const ASSIGNABLE_EMPLOYEE_STATUSES = ['DRAFT', 'INVITED', 'ACTIVE'];

export type EmployeeTargetFilter = {
  employeeIds?: string[];
  departments?: string[];
  jobTitles?: string[];
  all?: boolean;
};

/** Resolves an assignment target into active (or not yet activated) employee ids of the organization. */
export async function resolveEmployeeIds(
  organizationId: string,
  filter: EmployeeTargetFilter,
  client: DbOrTxClient = db
) {
  const conditions: SQL[] = [
    eq(schema.employee.organizationId, organizationId),
    inArray(schema.employee.status, ASSIGNABLE_EMPLOYEE_STATUSES)
  ];
  const selectors: SQL[] = [];
  if (filter.employeeIds?.length) selectors.push(inArray(schema.employee.id, filter.employeeIds));
  if (filter.departments?.length) selectors.push(inArray(schema.employee.department, filter.departments));
  if (filter.jobTitles?.length) selectors.push(inArray(schema.employee.jobTitle, filter.jobTitles));
  if (!filter.all) {
    if (!selectors.length) return [];
    conditions.push(sql`(${sql.join(selectors, sql` or `)})`);
  }
  const rows = await client
    .select({ id: schema.employee.id })
    .from(schema.employee)
    .where(and(...conditions));
  return rows.map((row) => row.id);
}

export async function listEmployeeFacets(organizationId: string, client: DbOrTxClient = db) {
  const rows = await client.execute<{ department: string; job_title: string }>(sql`select department, job_title
    from employee where organization_id = ${organizationId}
      and ${inArray(sql`status`, ASSIGNABLE_EMPLOYEE_STATUSES)}`);
  const departmentCounts: Record<string, number> = {};
  const jobTitleCounts: Record<string, number> = {};
  for (const row of rows) {
    if (row.department) departmentCounts[row.department] = (departmentCounts[row.department] ?? 0) + 1;
    if (row.job_title) jobTitleCounts[row.job_title] = (jobTitleCounts[row.job_title] ?? 0) + 1;
  }
  const departments = Object.keys(departmentCounts).sort((left, right) => left.localeCompare(right, 'vi'));
  const jobTitles = Object.keys(jobTitleCounts).sort((left, right) => left.localeCompare(right, 'vi'));
  return { departments, jobTitles, departmentCounts, jobTitleCounts, assignableEmployees: rows.length };
}

/** Employees who already hold a live assignment for every one of the courses. */
export async function listFullyAssignedEmployeeIds(courseIds: string[], client: DbOrTxClient = db) {
  if (!courseIds.length) return [];

  const rows = await client.execute<{ employee_id: string }>(sql`select employee_id from course_enrollment
    where kind = 'ASSIGNED' and status <> 'REVOKED' and ${inArray(sql`course_id`, courseIds)}
    group by employee_id having count(distinct course_id) = ${courseIds.length}`);
  return rows.map((row) => row.employee_id);
}

/** How an assignment would land: distinct recipients, new rows to create and rows that already exist. */
export async function previewEnrollmentTargets(
  organizationId: string,
  courseIds: string[],
  filter: EmployeeTargetFilter,
  client: DbOrTxClient = db
) {
  const employeeIds = await resolveEmployeeIds(organizationId, filter, client);
  const [existing] = employeeIds.length
    ? await client.execute<{ count: number }>(sql`select count(*)::int as count from course_enrollment
        where kind = 'ASSIGNED' and status <> 'REVOKED' and ${inArray(sql`course_id`, courseIds)}
          and ${inArray(sql`employee_id`, employeeIds)}`)
    : [{ count: 0 }];
  const existingAssignments = Number(existing?.count ?? 0);
  return {
    recipients: employeeIds.length,
    existingAssignments,
    newAssignments: employeeIds.length * courseIds.length - existingAssignments
  };
}

export async function findEmployeeByProfile(organizationId: string, profileId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select({ id: schema.employee.id, status: schema.employee.status, email: schema.employee.email })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.organizationmember.id, schema.employee.memberId))
    .where(and(eq(schema.employee.organizationId, organizationId), eq(schema.organizationmember.profileId, profileId)))
    .limit(1);
  return row ?? null;
}

/**
 * Records a completion cycle for a learner. Opens a new cycle only when there is none or the latest has expired,
 * so repeated evaluations of the same completion are idempotent.
 */
export async function recordCourseCompletion(
  input: {
    courseId: string;
    groupMemberId: string;
    profileId: string;
    completedAt: string;
    score?: number | null;
    recertificationMonths: number | null;
  },
  client: DbOrTxClient = db
) {
  const validUntil = input.recertificationMonths ? addMonths(input.completedAt, input.recertificationMonths) : null;
  const [row] = await client.execute<{ id: string; cycle_number: number }>(sql`insert into course_completion_record
      (course_id, group_member_id, profile_id, cycle_number, started_at, completed_at, valid_until, score)
    select ${input.courseId}, ${input.groupMemberId}, ${input.profileId},
      coalesce((select max(cycle_number) from course_completion_record where course_id = ${input.courseId} and profile_id = ${input.profileId}), 0) + 1,
      ${input.completedAt}, ${input.completedAt}, ${validUntil}, ${input.score ?? null}
    where not exists (select 1 from course_completion_record latest
      where latest.course_id = ${input.courseId} and latest.profile_id = ${input.profileId}
        and (latest.valid_until is null or latest.valid_until > now())
        and latest.cycle_number = (select max(cycle_number) from course_completion_record
          where course_id = ${input.courseId} and profile_id = ${input.profileId}))
    returning id, cycle_number`);
  return row ?? null;
}

function addMonths(isoDate: string, months: number) {
  const date = new Date(isoDate);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export type DueReminderRow = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  organizationId: string;
  profileId: string;
  email: string;
  fullname: string;
  dueDate: string;
  daysUntilDue: number;
};

/** Assigned, unfinished enrollments whose due date falls on one of the offsets (days from today) or is past due. */
export async function listAssignedEnrollmentsForReminder(
  options: { daysBefore: number[]; includeOverdue: boolean },
  client: DbOrTxClient = db
) {
  const offsets = options.daysBefore.length ? options.daysBefore : [0];
  const rows =
    await client.execute<DueReminderRow>(sql`select ce.id "enrollmentId", ce.course_id "courseId", co.title "courseTitle",
      e.organization_id "organizationId", om.profile_id "profileId", e.email, e.fullname, ce.due_date "dueDate",
      ((ce.due_date at time zone 'Asia/Ho_Chi_Minh')::date - (now() at time zone 'Asia/Ho_Chi_Minh')::date) "daysUntilDue"
    from course_enrollment ce
    join employee e on e.id = ce.employee_id and e.status = 'ACTIVE'
    join organizationmember om on om.id = e.member_id and om.status = 'ACTIVE' and om.profile_id is not null
    join course co on co.id = ce.course_id and co.status = 'ACTIVE' and co.is_published = true
    where ce.kind = 'ASSIGNED' and ce.status = 'ACTIVE' and ce.due_date is not null
      and ${enrollmentStateSql('ce')} in ('not_started', 'in_progress', 'overdue', 'expired')
      and (((ce.due_date at time zone 'Asia/Ho_Chi_Minh')::date - (now() at time zone 'Asia/Ho_Chi_Minh')::date) in ${sql`(${sql.join(
        offsets.map((value) => sql`${value}`),
        sql`, `
      )})`}
        ${options.includeOverdue ? sql`or ce.due_date < now()` : sql``})`);
  return rows.map((row) => ({
    ...row,
    dueDate: new Date(row.dueDate).toISOString(),
    daysUntilDue: Number(row.daysUntilDue)
  }));
}

export type ExpiredEnrollmentRow = {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  organizationId: string;
  groupMemberId: string;
  profileId: string;
  email: string;
  fullname: string;
  validUntil: string;
};

/** Assigned enrollments whose latest completion has expired and that have not been touched since it expired. */
export async function listExpiredAssignedEnrollments(client: DbOrTxClient = db) {
  const rows =
    await client.execute<ExpiredEnrollmentRow>(sql`select ce.id "enrollmentId", ce.course_id "courseId", co.title "courseTitle",
      e.organization_id "organizationId", gm.id "groupMemberId", om.profile_id "profileId", e.email, e.fullname,
      latest.valid_until "validUntil"
    from course_enrollment ce
    join employee e on e.id = ce.employee_id and e.status = 'ACTIVE'
    join organizationmember om on om.id = e.member_id and om.status = 'ACTIVE' and om.profile_id is not null
    join course co on co.id = ce.course_id and co.status = 'ACTIVE' and co.recertification_months is not null
    join groupmember gm on gm.group_id = co.group_id and gm.profile_id = om.profile_id
    join lateral (select ccr.valid_until from course_completion_record ccr
      where ccr.course_id = ce.course_id and ccr.profile_id = om.profile_id order by ccr.cycle_number desc limit 1) latest on true
    where ce.kind = 'ASSIGNED' and ce.status = 'ACTIVE' and latest.valid_until is not null and latest.valid_until <= now()
      and ce.updated_at < latest.valid_until`);
  return rows.map((row) => ({ ...row, validUntil: new Date(row.validUntil).toISOString() }));
}
