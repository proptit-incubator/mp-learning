import * as z from 'zod';

export const LESSON_COMPLETION_POLICIES = ['manual', 'video_watch', 'none'] as const;
export const DEFAULT_VIDEO_WATCH_THRESHOLD = 95;

export const ZCourseVideoWatchThreshold = z.number().int().min(1).max(100);

export const ZCourseLessonVideoRule = z.object({
  lessonId: z.string().min(1),
  completionPolicy: z.enum(LESSON_COMPLETION_POLICIES),
  enforcedAssetIds: z.array(z.string().min(1)).max(100)
});
export type TCourseLessonVideoRule = z.infer<typeof ZCourseLessonVideoRule>;

export const ZCourseVideoRulesUpdate = z.object({
  videoWatchThreshold: ZCourseVideoWatchThreshold,
  lessons: z.array(ZCourseLessonVideoRule).max(2000)
});
export type TCourseVideoRulesUpdate = z.infer<typeof ZCourseVideoRulesUpdate>;
