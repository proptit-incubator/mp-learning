import type { CreateEmployee } from '@cio/utils/validation/organization';
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
    role: 'EMPLOYEE',
    sendActivation: false
  };
}

export function employeeDetailsDraft(details: EmployeeDetails): CreateEmployee {
  const staff = details.employee;
  const role = staff.role as CreateEmployee['role'];
  return {
    employeeCode: staff.employeeCode,
    fullname: staff.fullname,
    email: staff.email,
    department: staff.department,
    jobTitle: staff.jobTitle,
    managerId: staff.managerId,
    startDate: staff.startDate ?? '',
    role,
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
        role: 'EMPLOYEE',
        managerId: null,
        managerCode: values.managerCode || '',
        sendActivation: false
      };
    });
}
