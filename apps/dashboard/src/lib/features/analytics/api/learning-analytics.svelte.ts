import { BaseApi, classroomio } from '$lib/utils/services/api';
import type {
  AnalyticsRange,
  LearningAnalyticsRequest,
  LearningAssignmentRow,
  LearningAssignmentsRequest,
  LearningDepartment,
  LearningReport,
  LearningState
} from '../utils/types';

export class LearningAnalyticsApi extends BaseApi {
  report = $state<LearningReport | null>(null);
  range = $state<AnalyticsRange>(30);
  departmentId = $state('');
  departmentOptions = $state<LearningDepartment[]>([]);
  loading = $state(true);
  failed = $state(false);
  #controller: AbortController | null = null;
  #organizationId = '';

  ensureOrganization(orgId: string) {
    if (!orgId || this.#organizationId === orgId) return;

    this.#organizationId = orgId;
    this.report = null;
    this.departmentId = '';
    this.departmentOptions = [];
    void this.load();
  }

  async load(days: AnalyticsRange = this.range) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.range = days;
    this.loading = true;
    this.failed = false;
    const departmentId = this.departmentId;
    const query = { days: String(days), ...(departmentId ? { departmentId } : {}) };
    const options = { init: { signal: controller.signal } };
    const result = await this.execute<LearningAnalyticsRequest>({
      requestFn: () => classroomio.dash['learning-analytics'].$get({ query }, options),
      logContext: 'loading internal training analytics',
      onSuccess: (response) => {
        if (controller.signal.aborted) return;

        this.report = response.data;
        if (!departmentId) this.departmentOptions = response.data.snapshot.departments;
      }
    });
    if (controller.signal.aborted) return;

    this.failed = !result;
    this.loading = false;
  }

  selectDepartment(departmentId: string) {
    if (departmentId === this.departmentId) return;

    this.departmentId = departmentId;
    void this.load();
  }

  cancel() {
    this.#controller?.abort();
  }
}

export type AssignmentFilters = {
  departmentId: string;
  courseId: string;
  batchLabel: string;
  state: LearningState | 'all';
  search: string;
};

const EXPORT_PAGE_SIZE = 500;

/** The assignments table: one server page at a time, plus every page for exports. */
export class LearningAssignmentsApi extends BaseApi {
  rows = $state<LearningAssignmentRow[]>([]);
  total = $state(0);
  page = $state(1);
  limit = 25;
  loading = $state(false);
  #controller: AbortController | null = null;

  #query(filters: AssignmentFilters, page: number, limit: number) {
    return {
      page: String(page),
      limit: String(limit),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(filters.batchLabel ? { batchLabel: filters.batchLabel } : {}),
      ...(filters.state !== 'all' ? { state: filters.state } : {}),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {})
    };
  }

  async load(filters: AssignmentFilters, page = 1) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.loading = true;
    const query = this.#query(filters, page, this.limit);
    await this.execute<LearningAssignmentsRequest>({
      requestFn: () =>
        classroomio.dash['learning-analytics'].assignments.$get({ query }, { init: { signal: controller.signal } }),
      logContext: 'loading assigned training',
      onSuccess: (response) => {
        if (controller.signal.aborted) return;

        this.rows = response.data.rows;
        this.total = response.data.total;
        this.page = response.data.page;
      }
    });
    if (!controller.signal.aborted) this.loading = false;
  }

  /** Every assignment matching `filters`, for exports. */
  async loadAll(filters: AssignmentFilters) {
    const rows: LearningAssignmentRow[] = [];
    for (let page = 1; ; page++) {
      const query = this.#query(filters, page, EXPORT_PAGE_SIZE);
      const response = await this.execute<LearningAssignmentsRequest>({
        requestFn: () => classroomio.dash['learning-analytics'].assignments.$get({ query }),
        logContext: 'exporting assigned training'
      });
      if (!response) throw new Error('Assigned training export failed');

      rows.push(...response.data.rows);
      if (rows.length >= response.data.total || response.data.rows.length < EXPORT_PAGE_SIZE) return rows;
    }
  }

  cancel() {
    this.#controller?.abort();
  }
}
