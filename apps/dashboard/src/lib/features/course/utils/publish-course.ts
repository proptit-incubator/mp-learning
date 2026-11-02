import { generateSlug } from '@cio/utils/functions';
import { courseApi } from '$features/course/api';
import { snackbar } from '$features/ui/snackbar/store';
import type { Course } from '$features/course/utils/types';

export type PublishCourseResult = { ok: true } | { ok: false; reason: 'failed' };

export async function publishCourse(course: Course): Promise<PublishCourseResult> {
  if (!course?.id) {
    return { ok: false, reason: 'failed' };
  }

  let slug = course.slug?.trim() ? course.slug : undefined;
  if (!slug) {
    slug = generateSlug(course.title, { appendTimestamp: true });
  }

  const result = await courseApi.update(
    course.id,
    {
      isPublished: true,
      slug
    },
    { showSuccessToast: true }
  );

  if (!result) {
    return { ok: false, reason: 'failed' };
  }

  return { ok: true };
}
