import { describe, expect, it } from 'vitest';
import { buildCertificateRegisterExport, daysUntil } from './certificate-register-utils';
import type { CertificateRegisterRow } from './types';

describe('daysUntil', () => {
  const now = new Date('2026-11-03T10:00:00.000Z');

  it('rounds partial days up and goes negative after expiry', () => {
    expect(daysUntil('2026-11-04T09:00:00.000Z', now)).toBe(1);
    expect(daysUntil('2026-12-03T10:00:00.000Z', now)).toBe(30);
    expect(daysUntil('2026-11-01T10:00:00.000Z', now)).toBe(-2);
  });

  it('has no countdown for certificates that never expire', () => {
    expect(daysUntil(null, now)).toBeNull();
  });
});

describe('buildCertificateRegisterExport', () => {
  it('exports dates as days and states as labels', () => {
    const row = {
      fullname: 'Nguyễn Văn Đức',
      employeeCode: 'MP001',
      department: 'An toàn',
      courseTitle: 'An toàn lao động',
      code: 'K7QX2M9DPA',
      issuedAt: '2026-11-03T10:00:00.000Z',
      expiresAt: null,
      state: 'revoked',
      revokedReason: 'Cấp nhầm'
    } as CertificateRegisterRow;
    const document = buildCertificateRegisterExport(
      [row],
      'Sổ chứng chỉ',
      {
        employee: 'Nhân viên',
        code: 'Mã NV',
        department: 'Phòng ban',
        course: 'Khoá học',
        certificate: 'Mã chứng chỉ',
        issued: 'Ngày cấp',
        expires: 'Hiệu lực đến',
        state: 'Trạng thái',
        reason: 'Lý do thu hồi'
      },
      (state) => (state === 'revoked' ? 'Đã thu hồi' : state)
    );

    expect(document.columns.map((column) => column.value(row))).toEqual([
      'Nguyễn Văn Đức',
      'MP001',
      'An toàn',
      'An toàn lao động',
      'K7QX2M9DPA',
      '2026-11-03',
      null,
      'Đã thu hồi',
      'Cấp nhầm'
    ]);
  });
});
