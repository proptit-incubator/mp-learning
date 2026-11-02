import { BaseApiWithErrors, classroomio, type InferRequestType, type InferResponseType } from '$lib/utils/services/api';
import { ZAssignCourses } from '@cio/utils/validation/course/enrollment';
import { mapZodErrorsToTranslations } from '$lib/utils/validation';
import { snackbar } from '$features/ui/snackbar/store';

export type AssignCoursesRequest = typeof classroomio.employees.assignments.$post;
export type AssignCoursesPayload = InferRequestType<AssignCoursesRequest>['json'];
export type AssignCoursesResult = Extract<InferResponseType<AssignCoursesRequest>, { success: true }>['data'];
type EmployeeOptionsRequest = typeof classroomio.employees.options.$get;
export type EmployeeFacets = Extract<InferResponseType<EmployeeOptionsRequest>, { success: true }>['data'];
type ListEmployeesRequest = typeof classroomio.employees.$get;
export type AssignableEmployee = Extract<
  InferResponseType<ListEmployeesRequest>,
  { success: true }
>['data']['rows'][number];
type ListCoursesRequest = typeof classroomio.organization.courses.$get;
export type AssignableCourse = Extract<InferResponseType<ListCoursesRequest>, { success: true }>['data'][number];

export class EnrollmentApi extends BaseApiWithErrors {
  facets = $state<EmployeeFacets | null>(null);
  employees = $state<AssignableEmployee[]>([]);
  courses = $state<AssignableCourse[]>([]);
  isSearchingEmployees = $state(false);
  isSearchingCourses = $state(false);
  lastResult = $state<AssignCoursesResult | null>(null);
  #employeeRequest = 0;
  #courseRequest = 0;

  async loadFacets() {
    const response = await classroomio.employees.options.$get();
    const body = await response.json();
    if (body.success) this.facets = body.data;
  }

  async searchEmployees(search = '') {
    const requestId = ++this.#employeeRequest;
    this.isSearchingEmployees = true;
    try {
      const response = await classroomio.employees.$get({ query: { search, page: '1', status: 'ACTIVE' } });
      const body = await response.json();
      if (requestId === this.#employeeRequest && body.success) this.employees = body.data.rows;
    } finally {
      if (requestId === this.#employeeRequest) this.isSearchingEmployees = false;
    }
  }

  async searchCourses(search = '') {
    const requestId = ++this.#courseRequest;
    this.isSearchingCourses = true;
    try {
      const response = await classroomio.organization.courses.$get({
        query: { search: search || undefined, status: 'published', page: '1', limit: '50' }
      });
      const body = await response.json();
      if (requestId === this.#courseRequest && body.success) this.courses = body.data;
    } finally {
      if (requestId === this.#courseRequest) this.isSearchingCourses = false;
    }
  }

  async assign(payload: AssignCoursesPayload) {
    const validated = ZAssignCourses.safeParse(payload);
    if (!validated.success) {
      this.errors = mapZodErrorsToTranslations(validated.error);
      snackbar.error('enrollment.failed');
      return null;
    }

    const result = await this.execute<AssignCoursesRequest>({
      requestFn: () => classroomio.employees.assignments.$post({ json: validated.data }),
      logContext: 'assigning courses',
      onSuccess: (response) => {
        this.lastResult = response.data;
      },
      onError: () => snackbar.error('enrollment.failed')
    });
    return result?.data ?? null;
  }
}

export const enrollmentApi = new EnrollmentApi();
