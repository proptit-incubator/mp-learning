import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import { ZCreateEmployee, ZUpdateEmployee, type EmployeeStatus } from '@cio/utils/validation/organization';
import {
  createEmployeeDraft,
  employeeDetailsDraft,
  employeeErrorKey,
  employeeImportRows
} from '../utils/employee-utils';
import type {
  ActivateEmployeeRequest,
  CreateEmployeeRequest,
  EditEmployeeRequest,
  EmployeeDetails,
  EmployeeDetailsRequest,
  EmployeeImportRow,
  EmployeeList,
  EmployeeLearningFilters,
  EmployeeOptions,
  EmployeeOptionsRequest,
  EmployeeRow,
  EmployeeStatusAction,
  EmployeeStatusRequest,
  ImportEmployeesRequest,
  ImportResult,
  ListEmployeesRequest,
  PreviewActivation,
  PreviewActivationRequest,
  SendActivationRequest
} from '../utils/types';
import type { EmployeeAccess, EmployeeAccessRequest } from '../utils/types';
import { snackbar } from '$features/ui/snackbar/store';
import { t } from '$lib/utils/functions/translations';
import Papa from 'papaparse';

export class EmployeesApi extends BaseApiWithErrors {
  roster = $state<EmployeeList | null>(null);
  options = $state<EmployeeOptions | null>(null);
  details = $state<EmployeeDetails | null>(null);
  fields = $state(createEmployeeDraft());
  editingId = $state<string | null>(null);
  editorOpen = $state(false);
  detailOpen = $state(false);
  message = $state('');
  profileId = $state<string | undefined>(undefined);
  learningFilters = $state<EmployeeLearningFilters>({});
  search = $state('');
  department = $state('');
  jobTitle = $state('');
  status = $state<EmployeeStatus | ''>('');
  page = $state(1);
  importRows = $state<EmployeeImportRow[]>([]);
  importResult = $state<ImportResult | null>(null);
  importSend = $state(true);
  importOpen = $state(false);
  importing = $state(false);
  exporting = $state(false);
  statusTarget = $state<EmployeeRow | null>(null);
  nextStatus = $state<EmployeeStatusAction>('SUSPENDED');
  reason = $state('');
  preview = $state<PreviewActivation | null>(null);
  activated = $state(false);
  access = $state<EmployeeAccess | null>(null);
  #accessOrgId = '';
  #loadSequence = 0;

  async loadAccess(orgId: string) {
    if (this.#accessOrgId === orgId) return;

    this.#accessOrgId = orgId;
    this.access = null;
    const response = await this.execute<EmployeeAccessRequest>({
      requestFn: () => classroomio.employees.access.$get(),
      logContext: 'checking employee permissions'
    });
    if (this.#accessOrgId === orgId && response) this.access = response.data;
  }

  async load() {
    const sequence = ++this.#loadSequence;
    const status = this.status || undefined;
    const query = {
      ...this.learningFilters,
      profileId: this.profileId,
      search: this.search,
      department: this.department,
      jobTitle: this.jobTitle || undefined,
      status,
      page: String(this.page),
      limit: '25'
    };
    const response = await this.execute<ListEmployeesRequest>({
      requestFn: () => classroomio.employees.$get({ query }),
      logContext: 'loading employees',
      onError: (error) => {
        this.message = employeeErrorKey(error);
      }
    });
    if (response && sequence === this.#loadSequence) {
      this.roster = response.data;
      this.message = '';
    }
  }

  async loadOptions() {
    const response = await this.execute<EmployeeOptionsRequest>({
      requestFn: () => classroomio.employees.options.$get(),
      logContext: 'loading employee options'
    });
    if (response) this.options = response.data;
  }

  async openCreate() {
    await this.loadOptions();
    Object.assign(this.fields, createEmployeeDraft());
    this.editingId = null;
    this.message = '';
    this.editorOpen = true;
  }

  async view(staff: EmployeeRow) {
    const param = { id: staff.id };
    const response = await this.execute<EmployeeDetailsRequest>({
      requestFn: () => classroomio.employees[':id'].$get({ param }),
      onError: (error) => {
        this.message = employeeErrorKey(error);
      }
    });
    if (!response) return;

    this.details = response.data;
    this.detailOpen = true;
  }

  async openEdit(staff: EmployeeRow) {
    await this.view(staff);
    if (!this.details || this.details.employee.id !== staff.id) return;

    await this.loadOptions();
    this.detailOpen = false;
    this.editingId = staff.id;
    Object.assign(this.fields, employeeDetailsDraft(this.details));
    this.message = '';
    this.editorOpen = true;
  }

  async save(sendActivation = false) {
    const parsed = ZCreateEmployee.safeParse(this.fields);
    if (!parsed.success) {
      this.message = 'employees.errors.fields';
      return;
    }

    if (this.editingId) {
      const json = ZUpdateEmployee.parse(parsed.data);
      const param = { id: this.editingId };
      await this.execute<EditEmployeeRequest>({
        requestFn: () => classroomio.employees[':id'].$put({ param, json }),
        onError: (error) => {
          this.message = employeeErrorKey(error);
        },
        onSuccess: () => {
          this.editorOpen = false;
        }
      });
    } else {
      const json = { ...parsed.data, sendActivation };
      await this.execute<CreateEmployeeRequest>({
        requestFn: () => classroomio.employees.$post({ json }),
        onError: (error) => {
          this.message = employeeErrorKey(error);
        },
        onSuccess: (response) => {
          this.editorOpen = false;
          if (response.data.delivery && !response.data.delivery.sent) snackbar.error('employees.errors.email');
        }
      });
    }
    if (!this.editorOpen) {
      snackbar.success('employees.saved');
      await this.load();
    }
  }

  async resend(staff: EmployeeRow) {
    const param = { id: staff.id };
    const response = await this.execute<SendActivationRequest>({
      requestFn: () => classroomio.employees[':id'].activation.$post({ param }),
      onError: (error) => {
        this.message = employeeErrorKey(error);
      },
      onSuccess: (response) => {
        if (response.data.sent) snackbar.success('employees.sent');
        else snackbar.error('employees.errors.email');
      }
    });
    if (response) await this.load();
  }

  openStatus(staff: EmployeeRow, status: EmployeeStatusAction) {
    this.statusTarget = staff;
    this.nextStatus = status;
    this.reason = '';
    this.message = '';
  }

  async changeStatus() {
    if (!this.statusTarget || !this.reason.trim()) return;

    const param = { id: this.statusTarget.id };
    const json = { status: this.nextStatus, reason: this.reason };
    const response = await this.execute<EmployeeStatusRequest>({
      requestFn: () => classroomio.employees[':id'].status.$post({ param, json }),
      onError: (error) => {
        this.message = employeeErrorKey(error);
      },
      onSuccess: () => {
        this.statusTarget = null;
        snackbar.success('employees.saved');
      }
    });
    if (response) await this.load();
  }

  async readImport(file: File) {
    this.importResult = null;
    this.importRows = [];
    this.message = '';
    if (file.size > 5 * 1024 * 1024 || !/\.(csv|xlsx)$/i.test(file.name)) {
      this.message = 'employees.errors.file';
      return;
    }

    try {
      let cells: unknown[][];
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        cells = await readSheet(file);
      } else {
        const contents = await file.text();
        const parsed = Papa.parse<string[]>(contents, { skipEmptyLines: 'greedy' });
        if (parsed.errors.length) throw new Error('employees.errors.file');

        cells = parsed.data;
      }
      this.importRows = employeeImportRows(cells);
    } catch (error) {
      console.error('readImport error:', error);
      this.message =
        error instanceof Error && error.message.startsWith('employees.errors.')
          ? error.message
          : 'employees.errors.file';
    }
  }

  async runImport(preview: boolean) {
    const rows = this.importRows.map((row) => ({
      ...row,
      sendActivation: this.importSend
    }));
    this.importing = true;
    try {
      if (preview) {
        const json = { rows, preview };
        await this.execute<ImportEmployeesRequest>({
          requestFn: () => classroomio.employees.import.$post({ json }),
          onError: (error) => {
            this.message = employeeErrorKey(error);
          },
          onSuccess: (response) => {
            this.importResult = response.data;
          }
        });
        return;
      }

      const outcomes: ImportResult['rows'] = [];
      this.importResult = { preview: false, rows: outcomes };
      for (let offset = 0; offset < rows.length; offset += 5) {
        const batch = rows.slice(offset, offset + 5);
        const json = { rows: batch, preview: false };
        const response = await this.execute<ImportEmployeesRequest>({
          requestFn: () => classroomio.employees.import.$post({ json }),
          onError: (error) => {
            this.message = employeeErrorKey(error);
          }
        });
        if (!response) return;

        const batchOutcomes = response.data.rows.map((row) => ({ ...row, row: row.row + offset }));
        outcomes.push(...batchOutcomes);
        this.importResult = { preview: false, rows: [...outcomes] };
      }
      await this.load();
    } finally {
      this.importing = false;
    }
  }

  async exportEmployees() {
    this.exporting = true;
    const search = this.search;
    const department = this.department;
    const status = this.status || undefined;
    const learningFilters = { ...this.learningFilters };
    const profileId = this.profileId;
    try {
      const rows: EmployeeRow[] = [];
      let page = 1;
      for (;;) {
        const query = { ...learningFilters, profileId, search, department, status, page: String(page), limit: '100' };
        const response = await this.execute<ListEmployeesRequest>({
          requestFn: () => classroomio.employees.$get({ query }),
          onError: (error) => {
            this.message = employeeErrorKey(error);
          }
        });
        if (!response) return;

        rows.push(...response.data.rows);
        if (rows.length >= response.data.total || !response.data.rows.length) break;

        page++;
      }
      const records = rows.map((row) => ({
        employeeCode: row.employeeCode,
        fullname: row.fullname,
        email: row.email,
        department: row.department,
        jobTitle: row.jobTitle,
        status: t.get(`employees.status.${row.status}`),
        role: t.get(`employees.role.${row.role}`),
        startDate: row.startDate ?? ''
      }));
      const contents = Papa.unparse(records, { escapeFormulae: true });
      this.download(contents, 'employees.csv');
    } finally {
      this.exporting = false;
    }
  }

  downloadTemplate() {
    this.download(
      'employeeCode,fullname,email,department,jobTitle,startDate\nMP001,Nguyen Van A,employee@example.com,Operations,Specialist,2026-10-27\n',
      'employees-template.csv'
    );
  }

  downloadFailures() {
    const failedRows = this.importResult?.rows.filter((row) => !row.success) ?? [];
    const records = failedRows.map((row) => ({ ...this.importRows[row.row - 2], error: t.get(row.message) }));
    const contents = Papa.unparse(records, { escapeFormulae: true });
    this.download(contents, 'employees-errors.csv');
  }

  private download(contents: string, filename: string) {
    const blob = new Blob(['\uFEFF', contents], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async loadActivation(token: string) {
    const json = { token };
    await this.execute<PreviewActivationRequest>({
      requestFn: () => classroomio.employees.activation.preview.$post({ json }),
      onError: () => {
        this.message = 'employees.errors.activation';
      },
      onSuccess: (response) => {
        this.preview = response.data;
      }
    });
  }

  async activate(token: string, password?: string) {
    const json = { token, password };
    await this.execute<ActivateEmployeeRequest>({
      requestFn: () => classroomio.employees.activation.$post({ json }),
      onError: (error) => {
        this.message = employeeErrorKey(error);
      },
      onSuccess: () => {
        this.activated = true;
      }
    });
  }
}

export const employeesApi = new EmployeesApi();
