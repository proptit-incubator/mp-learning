import { BaseApi, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import { employeeErrorKey } from '../utils/employee-utils';
import type { DeleteDepartmentRequest, Department, DepartmentsRequest, RenameDepartmentRequest } from '../utils/types';

export class DepartmentsApi extends BaseApi {
  departments = $state<Department[]>([]);
  savingId = $state('');

  async load() {
    const response = await this.execute<DepartmentsRequest>({
      requestFn: () => classroomio.employees.departments.$get(),
      logContext: 'loading departments'
    });
    if (response) this.departments = response.data;
  }

  /** Renames a department; a name another department already uses merges the two. Returns true on success. */
  async rename(departmentId: string, name: string) {
    this.savingId = departmentId;
    const response = await this.execute<RenameDepartmentRequest>({
      requestFn: () =>
        classroomio.employees.departments[':departmentId'].$patch({ param: { departmentId }, json: { name } }),
      logContext: 'renaming department',
      onError: (error) => snackbar.error(employeeErrorKey(error))
    });
    this.savingId = '';
    if (!response) return false;

    snackbar.success(response.data.merged ? 'employees.departments.merged' : 'employees.departments.renamed');
    await this.load();
    return true;
  }

  async remove(departmentId: string) {
    this.savingId = departmentId;
    const response = await this.execute<DeleteDepartmentRequest>({
      requestFn: () => classroomio.employees.departments[':departmentId'].$delete({ param: { departmentId } }),
      logContext: 'deleting department',
      onError: (error) => snackbar.error(employeeErrorKey(error))
    });
    this.savingId = '';
    if (!response) return;

    snackbar.success('employees.departments.deleted');
    await this.load();
  }
}
