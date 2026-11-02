import { sql } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';

export type TCertificateIssue = {
  id: string;
  code: string;
  cycleNumber: number;
  issuedAt: string;
  expiresAt: string | null;
  status: string;
};

export type TCertificateVerification = TCertificateIssue & {
  courseTitle: string;
  organizationName: string;
  recipientName: string;
  employeeCode: string | null;
};

/**
 * Returns the certificate of the learner's latest completion cycle, issuing it with `code` and `issuedAt` when that
 * cycle has none yet. Returns null when the learner has no completion cycle in the course.
 */
export async function ensureLatestCycleCertificate(
  courseId: string,
  profileId: string,
  issue: { code: string; issuedAt: string },
  client: DbOrTxClient = db
): Promise<TCertificateIssue | null> {
  try {
    await client.execute(sql`insert into course_certificate_issue
        (course_id, profile_id, course_completion_record_id, cycle_number, issued_at, expires_at, code)
      select ccr.course_id, ccr.profile_id, ccr.id, ccr.cycle_number, ${issue.issuedAt}, ccr.valid_until, ${issue.code}
      from course_completion_record ccr
      where ccr.course_id = ${courseId} and ccr.profile_id = ${profileId}
      order by ccr.cycle_number desc limit 1
      on conflict (course_completion_record_id) do nothing`);
    const [row] = await client.execute<TCertificateIssue>(sql`select cci.id, cci.code, cci.cycle_number "cycleNumber",
        cci.issued_at "issuedAt", cci.expires_at "expiresAt", cci.status
      from course_certificate_issue cci
      where cci.course_completion_record_id = (select ccr.id from course_completion_record ccr
        where ccr.course_id = ${courseId} and ccr.profile_id = ${profileId} order by ccr.cycle_number desc limit 1)`);
    return row ? { ...row, issuedAt: new Date(row.issuedAt).toISOString(), expiresAt: toIso(row.expiresAt) } : null;
  } catch (error) {
    console.error('ensureLatestCycleCertificate error:', error);
    throw new Error('Failed to issue the course certificate');
  }
}

/** Looks up an issued certificate by its verification code, with the course, organization and recipient names. */
export async function findCertificateByCode(code: string): Promise<TCertificateVerification | null> {
  try {
    const [row] = await db.execute<TCertificateVerification>(sql`select cci.id, cci.code,
        cci.cycle_number "cycleNumber", cci.issued_at "issuedAt", cci.expires_at "expiresAt", cci.status,
        c.title "courseTitle", o.name "organizationName",
        coalesce(e.fullname, p.fullname, '') "recipientName", e.employee_code "employeeCode"
      from course_certificate_issue cci
      join course c on c.id = cci.course_id
      join "group" g on g.id = c.group_id
      join organization o on o.id = g.organization_id
      left join profile p on p.id = cci.profile_id
      left join organizationmember om on om.profile_id = cci.profile_id and om.organization_id = o.id
      left join employee e on e.member_id = om.id
      where cci.code = ${code}
      limit 1`);
    return row ? { ...row, issuedAt: new Date(row.issuedAt).toISOString(), expiresAt: toIso(row.expiresAt) } : null;
  } catch (error) {
    console.error('findCertificateByCode error:', error);
    throw new Error('Failed to look up the certificate');
  }
}

function toIso(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}
