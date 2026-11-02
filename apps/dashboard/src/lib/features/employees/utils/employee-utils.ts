import { EMPLOYEE_ROLES, type CreateEmployee } from '@cio/utils/validation/organization';
import type { EmployeeDetails, EmployeeImportRow } from './types';

export function createEmployeeDraft(): CreateEmployee {
  return {
    employeeCode: '',
    fullname: '',
    email: '',
    department: '',
    jobTitle: '',
    managerId: null,
    startDate: '',
    roles: [],
    sendActivation: false
  };
}

/** Comma-separated labels of the roles held, or the plain employee label when none are. */
export function employeeRoleLabel(roles: readonly string[], translate: (key: string) => string): string {
  const heldRoles = EMPLOYEE_ROLES.filter((role) => roles.includes(role));
  if (!heldRoles.length) return translate('employees.role.EMPLOYEE');

  return heldRoles.map((role) => translate(`employees.role.${role}`)).join(', ');
}

export function employeeDetailsDraft(details: EmployeeDetails): CreateEmployee {
  const staff = details.employee;
  return {
    employeeCode: staff.employeeCode,
    fullname: staff.fullname,
    email: staff.email,
    department: staff.department,
    jobTitle: staff.jobTitle,
    managerId: staff.managerId,
    startDate: staff.startDate ?? '',
    roles: [...staff.roles],
    sendActivation: false
  };
}

export function employeeErrorKey(error: unknown): string {
  if (
    typeof error === 'object' &&
    error &&
    'error' in error &&
    typeof error.error === 'string' &&
    /^employees\.errors\.[a-z_]+$/.test(error.error)
  )
    return error.error;

  return 'employees.errors.generic';
}

export function employeeImportRows(cells: unknown[][]): EmployeeImportRow[] {
  const headers =
    cells[0]?.map((value) =>
      String(value ?? '')
        .replace(/^\uFEFF/, '')
        .trim()
    ) ?? [];
  const required = ['employeeCode', 'fullname', 'email'];
  if (!required.every((key) => headers.includes(key))) throw new Error('employees.errors.columns');
  if (cells.length > 1001) throw new Error('employees.errors.file');

  return cells
    .slice(1)
    .filter((row) => row.some((value) => value !== null && value !== ''))
    .map((row) => {
      const values = Object.fromEntries(
        headers.map((header, index) => [
          header,
          row[index] instanceof Date ? row[index].toISOString().slice(0, 10) : String(row[index] ?? '').trim()
        ])
      );
      return {
        employeeCode: values.employeeCode,
        fullname: values.fullname,
        email: values.email,
        department: values.department || '',
        jobTitle: values.jobTitle || '',
        startDate: values.startDate || '',
        roles: [],
        managerId: null,
        managerCode: values.managerCode || '',
        sendActivation: false
      };
    });
}
