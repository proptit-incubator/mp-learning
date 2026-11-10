import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import type { TCourseVideoRulesUpdate } from '@cio/utils/validation/course/video-rules';

import type { CourseVideoRules, GetCourseVideoRulesRequest, UpdateCourseVideoRulesRequest } from '../utils/types';

/**
 * Course-wide completion and video watch rules for every lesson in a course.
 */
export class CourseVideoRulesApi extends BaseApiWithErrors {
  rules = $state<CourseVideoRules | null>(null);
  loadedCourseId = $state<string | null>(null);

  async load(courseId: string) {
    await this.execute<GetCourseVideoRulesRequest>({
      requestFn: () => classroomio.course[':courseId']['video-rules'].$get({ param: { courseId } }),
      logContext: 'fetching course video rules',
      onSuccess: (response) => {
        this.rules = response.data;
        this.loadedCourseId = courseId;
      },
      onError: () => {
        snackbar.error('course.navItem.settings.video_rules.load_error');
      }
    });
  }

  async save(courseId: string, payload: TCourseVideoRulesUpdate): Promise<boolean> {
    let saved = false;

    await this.execute<UpdateCourseVideoRulesRequest>({
      requestFn: () => classroomio.course[':courseId']['video-rules'].$put({ param: { courseId }, json: payload }),
      logContext: 'updating course video rules',
      onSuccess: (response) => {
        this.rules = response.data;
        saved = true;
      },
      onError: () => {
        snackbar.error('course.navItem.settings.video_rules.save_error');
      }
    });

    return saved;
  }
}

export const courseVideoRulesApi = /* @__PURE__ */ new CourseVideoRulesApi();
