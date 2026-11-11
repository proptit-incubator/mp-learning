import type {
  AddPeopleRequest,
  AvailableCourseEmployeesRequest,
  AvailableCourseEmployees,
  DeletePeopleRequest,
  GetUserCourseAnalyticsRequest,
  ListPeopleRequest,
  ListPeopleQuery,
  ResetMemberCourseProgressRequest,
  UpdatePeopleRequest
} from '../utils/types';
import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';

import { toPeopleRequestQuery } from '$features/course/utils/people-utils';

import type { TAddCourseMembers } from '@cio/utils/validation/course/people';
import { snackbar } from '$features/ui/snackbar/store';
import { t } from '$lib/utils/functions/translations';
import type {
  CancelEnrollmentWaiverRequest,
  RevokeEnrollmentRequest,
  UpdateEnrollmentDueDateRequest,
  WaiveEnrollmentRequest
} from '../utils/types';

/**
 * API class for course members operations
 */
export class PeopleApi extends BaseApiWithErrors {
  async updateEnrollmentDueDate(courseId: string, enrollmentId: string, dueDate: string | null) {
    return this.execute<UpdateEnrollmentDueDateRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].members.enrollments[':enrollmentId'].$patch({
          param: { courseId, enrollmentId },
          json: { dueDate }
        }),
      logContext: 'updating an enrollment due date',
      onSuccess: () => snackbar.success('enrollment.saved'),
      onError: () => snackbar.error('enrollment.failed')
    });
  }

  async waiveEnrollment(courseId: string, enrollmentId: string, json: { reason: string; expiresAt: string | null }) {
    return this.execute<WaiveEnrollmentRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].members.enrollments[':enrollmentId'].waive.$post({
          param: { courseId, enrollmentId },
          json
        }),
      logContext: 'waiving an enrollment',
      onSuccess: () => snackbar.success('enrollment.saved'),
      onError: () => snackbar.error('enrollment.failed')
    });
  }

  async cancelEnrollmentWaiver(courseId: string, enrollmentId: string) {
    return this.execute<CancelEnrollmentWaiverRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].members.enrollments[':enrollmentId'].waive.$delete({
          param: { courseId, enrollmentId }
        }),
      logContext: 'cancelling an enrollment waiver',
      onSuccess: () => snackbar.success('enrollment.saved'),
      onError: () => snackbar.error('enrollment.failed')
    });
  }

  async revokeEnrollment(courseId: string, enrollmentId: string) {
    return this.execute<RevokeEnrollmentRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].members.enrollments[':enrollmentId'].$delete({
          param: { courseId, enrollmentId }
        }),
      logContext: 'revoking an enrollment',
      onSuccess: () => snackbar.success('enrollment.revoked'),
      onError: () => snackbar.error('enrollment.failed')
    });
  }

  availableEmployees = $state<AvailableCourseEmployees | null>(null);
  private availableEmployeesRequest = 0;

  async listAvailableEmployees(courseId: string, search = '') {
    const requestId = ++this.availableEmployeesRequest;
    return this.execute<AvailableCourseEmployeesRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].members.available.$get({ param: { courseId }, query: { search } }),
      logContext: 'listing available course employees',
      onSuccess: (response) => {
        if (requestId === this.availableEmployeesRequest) this.availableEmployees = response.data;
      },
      onError: () => {
        if (requestId !== this.availableEmployeesRequest) return;

        this.availableEmployees ??= [];
        snackbar.error('snackbar.course_api.members_list_failed');
      }
    });
  }

  /**
   * Lists all course members for a course
   * @param courseId Course ID
   * @returns Array of course members with profile data
   */
  async list(courseId: string, query: ListPeopleQuery) {
    const requestQuery = toPeopleRequestQuery(query);

    return this.execute<ListPeopleRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'].$get({
          param: { courseId },
          query: requestQuery
        }),
      logContext: 'listing course members',
      onSuccess: (response) => {
        if (response.data) {
          this.success = true;
          this.errors = {};
        }
      },
      onError: (result) => {
        if (typeof result === 'string') {
          snackbar.error('snackbar.course_api.members_list_failed');
        }
      }
    });
  }

  /**
   * Adds course members to a course
   * @param courseId Course ID
   * @param members Array of members to add
   * @returns Array of created members or null on error
   */
  async add(courseId: string, members: TAddCourseMembers, sendEmail = true) {
    const emailOption = sendEmail ? 'true' : 'false';
    return this.execute<AddPeopleRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'].$post({
          param: { courseId },
          query: { sendEmail: emailOption },
          json: members
        }),
      logContext: 'adding course members',
      onSuccess: (response) => {
        if (response.data) {
          const count = Array.isArray(response.data) ? response.data.length : 1;
          snackbar.success(t.get('snackbar.course_api.members_added', { count }));
          this.success = true;
          this.errors = {};
        }
      },
      onError: (result) => {
        snackbar.error('snackbar.course_api.members_add_failed');
      }
    });
  }

  /**
   * Updates a course member
   * @param courseId Course ID
   * @param memberId Member ID
   * @param data Partial member data to update
   * @returns The updated member data or null on error
   */
  async update(courseId: string, memberId: string, data: Partial<{ roleId: number; email: string }>) {
    await this.execute<UpdatePeopleRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'][':memberId'].$put({
          param: { courseId, memberId },
          json: data
        }),
      logContext: 'updating course member',
      onSuccess: (response) => {
        if (response.data) {
          snackbar.success('snackbar.course_api.member_updated');
          this.success = true;
          this.errors = {};
        }
      },
      onError: (result) => {
        if (typeof result === 'string') {
          snackbar.error('snackbar.course_api.member_update_failed');
          return;
        }
        if ('error' in result && 'field' in result && result.field) {
          this.errors[result.field] = result.error;
          snackbar.error(result.error);
        } else if ('error' in result) {
          this.errors.general = result.error;
          snackbar.error(result.error);
        }
      }
    });
  }

  /**
   * Deletes a course member
   * @param courseId Course ID
   * @param memberId Member ID
   * @returns The deleted member data or null on error
   */
  async delete(courseId: string, memberId: string) {
    await this.execute<DeletePeopleRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'][':memberId'].$delete({
          param: { courseId, memberId }
        }),
      logContext: 'deleting course member',
      onSuccess: (response) => {
        if (response.data) {
          snackbar.success('snackbar.course_api.member_removed');
          this.success = true;
          this.errors = {};
        }
      },
      onError: (result) => {
        if (typeof result === 'string') {
          snackbar.error('snackbar.course_api.member_remove_failed');
        }
      }
    });
  }

  /**
   * Gets user course analytics for a specific course
   * @param courseId Course ID
   * @param userId User ID (profile ID)
   * @returns User course analytics data or null on error
   */
  async getUserCourseAnalytics(courseId: string, userId: string) {
    return this.execute<GetUserCourseAnalyticsRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'][':userId']['analytics'].$get({
          param: { courseId, userId }
        }),
      logContext: 'fetching user course analytics',
      onSuccess: (response) => {
        if (response.data) {
          this.success = true;
          this.errors = {};
        }
      },
      onError: (result) => {
        if (typeof result === 'string') {
          snackbar.error('snackbar.course_api.user_analytics_failed');
        }
      }
    });
  }

  /**
   * Resets all learner progress for a course member while keeping them enrolled.
   */
  async resetCourseProgress(courseId: string, memberId: string) {
    await this.execute<ResetMemberCourseProgressRequest>({
      requestFn: () =>
        classroomio.course[':courseId']['members'][':memberId']['reset-progress'].$post({
          param: { courseId, memberId }
        }),
      logContext: 'resetting course member progress',
      onSuccess: () => {
        snackbar.success('snackbar.course.people.progress_reset');
        this.success = true;
        this.errors = {};
      },
      onError: (result) => {
        if (typeof result === 'string') {
          snackbar.error('snackbar.course.people.progress_reset_failed');
        }
      }
    });
  }
}

export const peopleApi = /* @__PURE__ */ new PeopleApi();
