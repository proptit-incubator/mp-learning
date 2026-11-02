import { describe, expect, it } from 'vitest';
import { employeeImportRows, employeeRoleLabel } from './employee-utils';

describe('employee list imports', () => {
  it('preserves employee codes with leading zeroes, UTF-8 names, dates and manager codes', () => {
    const rows = employeeImportRows([
      ['\uFEFFemployeeCode', 'fullname', 'email', 'department', 'managerCode', 'startDate'],
      ['000123', 'Nguyễn Văn An', 'an@example.com', 'Vận hành', 'MP001', new Date('2026-10-27T00:00:00Z')],
      ['', '', '']
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      employeeCode: '000123',
      fullname: 'Nguyễn Văn An',
      managerCode: 'MP001',
      startDate: '2026-10-27',
      roles: []
    });
  });

  it('refuses missing identity columns and lists exceeding the row limit', () => {
    expect(() => employeeImportRows([['fullname', 'email']])).toThrow('employees.errors.columns');
    const rows = [
      ['employeeCode', 'fullname', 'email'],
      ...Array.from({ length: 1001 }, () => ['MP001', 'Employee', 'employee@example.com'])
    ];
    expect(() => employeeImportRows(rows)).toThrow('employees.errors.file');
  });

  it('does not import elevated roles or assignments from untrusted file columns', () => {
    const rows = employeeImportRows([
      ['employeeCode', 'fullname', 'email', 'role', 'courseIds'],
      ['MP001', 'Employee', 'employee@example.com', 'ADMIN', 'all']
    ]);
    expect(rows[0].roles).toEqual([]);
    expect(rows[0]).not.toHaveProperty('courseIds');
  });
});

describe('employee role labels', () => {
  const translate = (key: string) => key.replace('employees.role.', '');

  it('lists every role held in a stable order', () => {
    expect(employeeRoleLabel(['HR', 'ADMIN', 'LND'], translate)).toBe('ADMIN, LND, HR');
  });

  it('falls back to the plain employee label when no role is held', () => {
    expect(employeeRoleLabel([], translate)).toBe('EMPLOYEE');
  });
});
