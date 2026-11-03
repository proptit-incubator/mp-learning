import { classroomio, type InferRequestType, type InferResponseType } from '$lib/utils/services/api';
import type { CreateEmployee, EmployeeStatus } from '@cio/utils/validation/organization';

export type ListEmployeesRequest = typeof classroomio.employees.$get;
export type EmployeeLearningFilters = Pick<
  InferRequestType<ListEmployeesRequest>['query'],
  'enrollment' | 'completion' | 'certificate'
>;
export type EmployeeList = Extract<InferResponseType<ListEmployeesRequest>, { success: true }>['data'];
export type EmployeeRow = EmployeeList['rows'][number];
export type EmployeeAccess = EmployeeList['access'];
export type EmployeeAccessRequest = typeof classroomio.employees.access.$get;
export type EmployeeOptionsRequest = typeof classroomio.employees.options.$get;
export type EmployeeOptions = Extract<InferResponseType<EmployeeOptionsRequest>, { success: true }>['data'];
export type EmployeeDetailsRequest = (typeof classroomio.employees)[':id']['$get'];
export type EmployeeDetails = Extract<InferResponseType<EmployeeDetailsRequest>, { success: true }>['data'];
export type CreateEmployeeRequest = typeof classroomio.employees.$post;
export type EditEmployeeRequest = (typeof classroomio.employees)[':id']['$put'];
export type EmployeeStatusRequest = (typeof classroomio.employees)[':id']['status']['$post'];
export type SendActivationRequest = (typeof classroomio.employees)[':id']['activation']['$post'];
export type ImportEmployeesRequest = typeof classroomio.employees.import.$post;
export type ImportResult = Extract<InferResponseType<ImportEmployeesRequest>, { success: true }>['data'];
export type PreviewActivationRequest = typeof classroomio.employees.activation.preview.$post;
export type PreviewActivation = Extract<InferResponseType<PreviewActivationRequest>, { success: true }>['data'];
export type ActivateEmployeeRequest = typeof classroomio.employees.activation.$post;
export type EmployeeStatusAction = Extract<EmployeeStatus, 'ACTIVE' | 'SUSPENDED' | 'LEFT'>;
export type EmployeeImportRow = Partial<CreateEmployee> & { managerCode?: string };
export type DepartmentsRequest = typeof classroomio.employees.departments.$get;
export type Department = Extract<InferResponseType<DepartmentsRequest>, { success: true }>['data'][number];
export type RenameDepartmentRequest = (typeof classroomio.employees.departments)[':departmentId']['$patch'];
export type DeleteDepartmentRequest = (typeof classroomio.employees.departments)[':departmentId']['$delete'];
