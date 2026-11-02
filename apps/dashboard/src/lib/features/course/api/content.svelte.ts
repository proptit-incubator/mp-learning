import { isSubmittedWorkConflict } from '../utils/content-delete-utils';
import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import type {
  DeleteCourseContentRequest,
  UpdateCourseContentRequest,
  ReorderCourseContentRequest
} from '../utils/types';
import type { TCourseContentReorder } from '@cio/utils/validation/course';
import { ContentType } from '@cio/utils/constants/content';

export class ContentApi extends BaseApiWithErrors {
  async reorder(courseId: string, payload: TCourseContentReorder) {
    const result = await this.execute<ReorderCourseContentRequest>({
      requestFn: () => classroomio.course[':courseId'].content.reorder.$put({ param: { courseId }, json: payload }),
      logContext: 'reordering course outline',
      onError: () => snackbar.error('snackbar.lessons.sections_reorder_failed')
    });
    return Boolean(result?.success);
  }

  async updateContent(
    courseId: string,
    items: Array<{
      id: string;
      type: ContentType.Lesson | ContentType.Exercise;
      isUnlocked?: boolean;
      order?: number;
      sectionId?: string | null;
    }>
  ) {
    const result = await this.execute<UpdateCourseContentRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].content.$put({
          param: { courseId },
          json: { items }
        }),
      logContext: 'updating course content',
      onSuccess: () => {
        this.success = true;
        this.errors = {};
      },
      onError: (error) => {
        const errorMessage = typeof error === 'string' ? error : (error as any)?.error;
        snackbar.error(errorMessage || 'snackbar.course_api.content_update_failed');
      }
    });

    return Boolean(result?.success);
  }

  async deleteContent(
    courseId: string,
    payload: { sectionId?: string; items?: Array<{ id: string; type: ContentType.Lesson | ContentType.Exercise }> }
  ) {
    const result = await this.execute<DeleteCourseContentRequest>({
      requestFn: () =>
        classroomio.course[':courseId'].content.$delete({
          param: { courseId },
          json: payload
        }),
      logContext: 'deleting course content',
      onSuccess: () => {
        this.success = true;
        this.errors = {};
      },
      onError: (error) => {
        if (isSubmittedWorkConflict(error)) {
          snackbar.error('snackbar.lessons.content_has_submissions');
          return;
        }

        const errorMessage = typeof error === 'string' ? error : (error as any)?.error;
        snackbar.error(errorMessage || 'snackbar.course_api.content_delete_failed');
      }
    });

    return Boolean(result?.success);
  }
}

export const contentApi = /* @__PURE__ */ new ContentApi();
