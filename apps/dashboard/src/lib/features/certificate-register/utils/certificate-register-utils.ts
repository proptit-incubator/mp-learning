import type { ExportDocument } from '@cio/utils/export';
import type { CertificateRegisterRow, CertificateRegisterState } from './types';

const DAY_MS = 86_400_000;

/** Whole days until `expiresAt`, counted from `now`; negative once it has passed, null when it never expires. */
export function daysUntil(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / DAY_MS);
}

export const STATE_BADGE: Record<CertificateRegisterState, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  valid: 'success',
  expiring: 'warning',
  expired: 'destructive',
  revoked: 'secondary'
};

export function buildCertificateRegisterExport(
  rows: CertificateRegisterRow[],
  title: string,
  headers: Record<
    'employee' | 'code' | 'department' | 'course' | 'certificate' | 'issued' | 'expires' | 'state' | 'reason',
    string
  >,
  stateLabel: (state: CertificateRegisterState) => string
): ExportDocument<CertificateRegisterRow> {
  const day = (value: string | null) => (value ? value.slice(0, 10) : null);
  return {
    filename: 'mp-learning-certificate-register',
    title,
    subtitle: '',
    columns: [
      { key: 'employee', header: headers.employee, value: (row) => row.fullname },
      { key: 'code', header: headers.code, value: (row) => row.employeeCode },
      { key: 'department', header: headers.department, value: (row) => row.department },
      { key: 'course', header: headers.course, value: (row) => row.courseTitle },
      { key: 'certificate', header: headers.certificate, value: (row) => row.code },
      { key: 'issued', header: headers.issued, value: (row) => day(row.issuedAt) },
      { key: 'expires', header: headers.expires, value: (row) => day(row.expiresAt) },
      { key: 'state', header: headers.state, value: (row) => stateLabel(row.state) },
      { key: 'reason', header: headers.reason, value: (row) => row.revokedReason }
    ],
    rows
  };
}
