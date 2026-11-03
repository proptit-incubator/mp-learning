import { describe, expect, it } from 'vitest';
import { departmentNameKey, normalizeDepartmentName } from '../src/functions/department';

describe('department names', () => {
  it('collapses whitespace and keeps the casing people typed', () => {
    expect(normalizeDepartmentName('  Kế   toán  ')).toBe('Kế toán');
    expect(normalizeDepartmentName(undefined)).toBe('');
  });

  it('gives case and spacing variants one key', () => {
    expect(departmentNameKey(' kế  toán ')).toBe(departmentNameKey('KẾ TOÁN'));
    expect(departmentNameKey('Kế toán')).not.toBe(departmentNameKey('Kiểm toán'));
  });

  it('treats composed and decomposed Vietnamese as the same name', () => {
    expect(departmentNameKey('Kế toán'.normalize('NFD'))).toBe(departmentNameKey('Kế toán'));
  });
});
