import { ContentType } from '@cio/utils/constants/content';
import { getCourseContent } from './content';
import type { Course } from './types';

type LiveSessionLike = { type: string; callUrl?: string | null; lessonAt?: string | null };

export function isLiveSessionItem(item: LiveSessionLike | null | undefined) {
  return !!item && item.type === ContentType.Lesson && !!item.callUrl && !!item.lessonAt;
}

/** True when at least one lesson of the course is scheduled as a live session. */
export function courseHasLiveSession(course: Course | null | undefined) {
  if (!course) return false;

  const content = getCourseContent(course);
  const items = content.grouped ? content.sections.flatMap((section) => section.items) : content.items;
  return items.some((item) => isLiveSessionItem(item as LiveSessionLike));
}
