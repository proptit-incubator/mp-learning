import { sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import { foldVietnamese, VIETNAMESE_ACCENTED, VIETNAMESE_PLAIN } from '@cio/utils/functions/vietnamese';
import { teamCourseSql, type LearningAnalyticsScope } from '../dash/learning-analytics';
import { reportingLineSql } from '../organization/employees';

export type CertificateRegisterState = 'valid' | 'expiring' | 'expired' | 'revoked';

export type CertificateRegisterQuery = {
  search?: string;
  courseId?: string;
  departmentId?: string;
  state?: CertificateRegisterState;
  expiringWithinDays: number;
  page: number;
  limit: number;
};

export type CertificateRegisterRow = {
  id: string;
  code: string;
  courseId: string;
  courseTitle: string;
  profileId: string;
  employeeId: string | null;
  employeeCode: string | null;
  fullname: string;
  department: string;
  cycleNumber: number;
  issuedAt: string;
  expiresAt: string | null;
  state: CertificateRegisterState;
  revokedAt: string | null;
  revokedReason: string | null;
  revokedByName: string | null;
};

export type CertificateRegisterSummary = Record<CertificateRegisterState, number> & { total: number };

function scopeFilter(scope: LearningAnalyticsScope) {
  if (scope.kind === 'reports') return sql`AND e.id IN ${reportingLineSql(scope.managerEmployeeId)}`;
  if (scope.kind === 'courses') return sql`AND ${teamCourseSql('c', scope.teamProfileId)}`;
  return sql``;
}

function folded(column: SQL) {
  return sql`lower(translate(${column}, ${VIETNAMESE_ACCENTED}, ${VIETNAMESE_PLAIN}))`;
}

/**
 * Certificates of the organization's courses in `scope`, with the holder's employee record and a state worked out
 * now: revoked, expired, expiring within `expiringWithinDays`, or valid. Filters other than the state apply here.
 */
function registerCte(orgId: string, scope: LearningAnalyticsScope, query: CertificateRegisterQuery) {
  const search = query.search ? foldVietnamese(query.search.trim()) : '';
  const department =
    query.departmentId === 'none'
      ? sql`AND e.department_id IS NULL`
      : query.departmentId
        ? sql`AND e.department_id = ${query.departmentId}`
        : sql``;
  const pattern = `%${search}%`;

  return sql`register AS (
    SELECT cci.id, cci.code, cci.course_id AS "courseId", c.title AS "courseTitle", cci.profile_id AS "profileId",
      e.id AS "employeeId", e.employee_code AS "employeeCode", COALESCE(e.fullname, p.fullname, '') AS fullname,
      COALESCE(d.name, '') AS department, cci.cycle_number AS "cycleNumber", cci.issued_at AS "issuedAt",
      cci.expires_at AS "expiresAt", cci.revoked_at AS "revokedAt", cci.revoked_reason AS "revokedReason",
      revoker.fullname AS "revokedByName",
      CASE WHEN cci.status = 'revoked' THEN 'revoked'
        WHEN cci.expires_at IS NOT NULL AND cci.expires_at <= now() THEN 'expired'
        WHEN cci.expires_at IS NOT NULL AND cci.expires_at <= now() + make_interval(days => ${query.expiringWithinDays})
          THEN 'expiring'
        ELSE 'valid' END AS state
    FROM course_certificate_issue cci
    JOIN course c ON c.id = cci.course_id
    JOIN "group" g ON g.id = c.group_id
    LEFT JOIN profile p ON p.id = cci.profile_id
    LEFT JOIN organizationmember om ON om.profile_id = cci.profile_id AND om.organization_id = g.organization_id
    LEFT JOIN employee e ON e.member_id = om.id
    LEFT JOIN department d ON d.id = e.department_id
    LEFT JOIN profile revoker ON revoker.id = cci.revoked_by
    WHERE g.organization_id = ${orgId} AND c.is_template = false
      ${scopeFilter(scope)}
      ${query.courseId ? sql`AND cci.course_id = ${query.courseId}` : sql``}
      ${department}
      ${
        search
          ? sql`AND (${folded(sql`COALESCE(e.fullname, p.fullname, '')`)} LIKE ${pattern}
              OR lower(COALESCE(e.employee_code, '')) LIKE ${pattern} OR lower(cci.code) LIKE ${pattern}
              OR ${folded(sql`c.title`)} LIKE ${pattern})`
          : sql``
      }
  )`;
}

const STATE_ORDER = sql`CASE state WHEN 'expiring' THEN 0 WHEN 'expired' THEN 1 WHEN 'valid' THEN 2 ELSE 3 END`;

/** One page of the certificate register, soonest expiry first, plus the count of each state for the same filters. */
export async function listCertificateRegister(
  orgId: string,
  scope: LearningAnalyticsScope,
  query: CertificateRegisterQuery,
  client: DbOrTxClient = db
) {
  const [summary] = await client.execute<CertificateRegisterSummary>(sql`
    WITH ${registerCte(orgId, scope, query)}
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE state = 'valid')::int AS valid,
      COUNT(*) FILTER (WHERE state = 'expiring')::int AS expiring,
      COUNT(*) FILTER (WHERE state = 'expired')::int AS expired,
      COUNT(*) FILTER (WHERE state = 'revoked')::int AS revoked
    FROM register
  `);
  const rows = await client.execute<CertificateRegisterRow & { matching: number }>(sql`
    WITH ${registerCte(orgId, scope, query)}
    SELECT *, COUNT(*) OVER ()::int AS matching FROM register
    ${query.state ? sql`WHERE state = ${query.state}` : sql``}
    ORDER BY ${STATE_ORDER}, "expiresAt" ASC NULLS LAST, "issuedAt" DESC, id
    LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}
  `);
  const list = [...rows];
  const iso = (value: string | null) => (value ? new Date(value).toISOString() : null);

  return {
    rows: list.map(
      (row): CertificateRegisterRow => ({
        id: row.id,
        code: row.code,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        profileId: row.profileId,
        employeeId: row.employeeId,
        employeeCode: row.employeeCode,
        fullname: row.fullname,
        department: row.department,
        cycleNumber: row.cycleNumber,
        issuedAt: new Date(row.issuedAt).toISOString(),
        expiresAt: iso(row.expiresAt),
        state: row.state,
        revokedAt: iso(row.revokedAt),
        revokedReason: row.revokedReason,
        revokedByName: row.revokedByName
      })
    ),
    total: list[0]?.matching ?? 0,
    page: query.page,
    limit: query.limit,
    summary: summary ?? { total: 0, valid: 0, expiring: 0, expired: 0, revoked: 0 }
  };
}

/** Courses and departments that hold certificates in `scope`, for the register filters. */
export async function listCertificateRegisterFacets(
  orgId: string,
  scope: LearningAnalyticsScope,
  client: DbOrTxClient = db
) {
  const query = { expiringWithinDays: 30, page: 1, limit: 1 };
  const courses = await client.execute<{ id: string; title: string }>(sql`
    WITH ${registerCte(orgId, scope, query)}
    SELECT DISTINCT "courseId" AS id, "courseTitle" AS title FROM register ORDER BY title
  `);
  const departments = await client.execute<{ id: string | null; name: string }>(sql`
    WITH ${registerCte(orgId, scope, query)}
    SELECT DISTINCT e.department_id AS id, register.department AS name
    FROM register LEFT JOIN employee e ON e.id = register."employeeId"
    ORDER BY name
  `);
  return { courses: [...courses], departments: [...departments] };
}

/** The certificate when it belongs to one of the organization's courses. */
export async function findOrganizationCertificate(orgId: string, certificateId: string, client: DbOrTxClient = db) {
  const [row] = await client.execute<{ id: string; status: string; courseId: string }>(sql`
    SELECT cci.id, cci.status, cci.course_id AS "courseId"
    FROM course_certificate_issue cci
    JOIN course c ON c.id = cci.course_id
    JOIN "group" g ON g.id = c.group_id
    WHERE cci.id = ${certificateId} AND g.organization_id = ${orgId}
  `);
  return row ?? null;
}

export async function revokeCertificate(
  certificateId: string,
  revokedBy: string,
  reason: string,
  client: DbOrTxClient = db
) {
  await client.execute(sql`
    UPDATE course_certificate_issue
    SET status = 'revoked', revoked_at = now(), revoked_by = ${revokedBy}, revoked_reason = ${reason}
    WHERE id = ${certificateId}
  `);
}

export async function restoreCertificate(certificateId: string, client: DbOrTxClient = db) {
  await client.execute(sql`
    UPDATE course_certificate_issue
    SET status = 'valid', revoked_at = NULL, revoked_by = NULL, revoked_reason = NULL
    WHERE id = ${certificateId}
  `);
}

/** The employee who holds the certificate and its code, or null when the holder has no employee record. */
export async function findCertificateHolder(orgId: string, certificateId: string, client: DbOrTxClient = db) {
  const [row] = await client.execute<{ employeeId: string; code: string }>(sql`
    SELECT e.id AS "employeeId", cci.code
    FROM course_certificate_issue cci
    JOIN organizationmember om ON om.profile_id = cci.profile_id AND om.organization_id = ${orgId}
    JOIN employee e ON e.member_id = om.id
    WHERE cci.id = ${certificateId}
  `);
  return row ?? null;
}
