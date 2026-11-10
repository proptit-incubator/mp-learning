import { getCourseById, updateCourse } from '@cio/db/queries/course';
import { getLessonVideoRulesByCourseId, updateLesson } from '@cio/db/queries/lesson';
import { db } from '@cio/db/drizzle';
import type { TCourse, TLesson } from '@cio/db/types';
import { AppError, ErrorCodes } from '@cio/utils/errors';
import { DEFAULT_VIDEO_WATCH_THRESHOLD, type TCourseVideoRulesUpdate } from '@cio/utils/validation/course';
import { isEnforceableLessonVideoIncludingHls } from '../../utils/lesson-watch-enforcement';

type LessonVideos = NonNullable<TLesson['videos']>;
type LessonVideo = LessonVideos[number];
type LessonCompletionPolicy = TCourseVideoRulesUpdate['lessons'][number]['completionPolicy'];

export type CourseLessonVideoRuleVideo = {
  assetId: string | null;
  type: LessonVideo['type'];
  title: string;
  enforceable: boolean;
  watchEnforced: boolean;
};

export type CourseLessonVideoRule = {
  lessonId: string;
  title: string;
  sectionId: string | null;
  sectionTitle: string | null;
  completionPolicy: LessonCompletionPolicy;
  videos: CourseLessonVideoRuleVideo[];
};

export type CourseVideoRules = {
  videoWatchThreshold: number;
  lessons: CourseLessonVideoRule[];
};

function readCourseThreshold(metadata: unknown): number {
  const threshold = (metadata as { videoWatchThreshold?: unknown } | null)?.videoWatchThreshold;

  return typeof threshold === 'number' ? threshold : DEFAULT_VIDEO_WATCH_THRESHOLD;
}

function toCompletionPolicy(value: string | null): LessonCompletionPolicy {
  if (value === 'video_watch' || value === 'none') return value;

  return 'manual';
}

function getVideoTitle(video: LessonVideo, index: number): string {
  return video.metadata?.title || video.fileName || `Video ${index + 1}`;
}

async function requireCourse(courseId: string) {
  const [course] = await getCourseById(courseId);
  if (!course) {
    throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
  }

  return course;
}

/**
 * Course-wide watch threshold plus every lesson's completion rule and which of its
 * uploaded videos learners must watch without skipping.
 */
export async function getCourseVideoRules(courseId: string): Promise<CourseVideoRules> {
  const course = await requireCourse(courseId);
  const rows = await getLessonVideoRulesByCourseId(courseId);

  const lessons = rows.map((row) => {
    const videos = (row.videos ?? []).map((video, index) => ({
      assetId: video.assetId ?? null,
      type: video.type,
      title: getVideoTitle(video, index),
      enforceable: isEnforceableLessonVideoIncludingHls(video),
      watchEnforced: Boolean(video.watchEnforced)
    }));

    return {
      lessonId: row.id,
      title: row.title,
      sectionId: row.sectionId,
      sectionTitle: row.sectionTitle ?? null,
      completionPolicy: toCompletionPolicy(row.completionPolicy),
      videos
    };
  });

  return { videoWatchThreshold: readCourseThreshold(course.metadata), lessons };
}

function applyEnforcedFlags(videos: LessonVideos, enforcedAssetIds: Set<string>): LessonVideos {
  return videos.map((video) => {
    if (!video.assetId || !isEnforceableLessonVideoIncludingHls(video)) return video;

    return { ...video, watchEnforced: enforcedAssetIds.has(video.assetId) };
  });
}

/**
 * Saves the course watch threshold and applies the given completion rules to the
 * course's lessons in one transaction. The threshold is copied onto every lesson.
 */
export async function updateCourseVideoRules(
  courseId: string,
  payload: TCourseVideoRulesUpdate
): Promise<CourseVideoRules> {
  const course = await requireCourse(courseId);
  const rows = await getLessonVideoRulesByCourseId(courseId);
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  const rulesByLessonId = new Map(payload.lessons.map((rule) => [rule.lessonId, rule]));

  for (const rule of payload.lessons) {
    const row = rowsById.get(rule.lessonId);
    if (!row) {
      throw new AppError('Lesson does not belong to this course', ErrorCodes.VALIDATION_ERROR, 400);
    }

    if (rule.completionPolicy === 'video_watch' && rule.enforcedAssetIds.length === 0) {
      throw new AppError(
        `Lesson "${row.title}" needs at least one uploaded video to watch`,
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const rule = rulesByLessonId.get(row.id);
      const patch: Partial<TLesson> = {};

      if (row.videoWatchThreshold !== payload.videoWatchThreshold) {
        patch.videoWatchThreshold = payload.videoWatchThreshold;
      }

      if (rule) {
        const enforcedAssetIds = new Set(rule.completionPolicy === 'video_watch' ? rule.enforcedAssetIds : []);
        const currentVideos = row.videos ?? [];
        const nextVideos = applyEnforcedFlags(currentVideos, enforcedAssetIds);

        if (toCompletionPolicy(row.completionPolicy) !== rule.completionPolicy) {
          patch.completionPolicy = rule.completionPolicy;
        }

        if (JSON.stringify(nextVideos) !== JSON.stringify(currentVideos)) {
          patch.videos = nextVideos;
        }
      }

      if (Object.keys(patch).length > 0) {
        await updateLesson(row.id, patch, tx);
      }
    }

    const currentMetadata = (course.metadata as Record<string, unknown> | null) ?? {};
    const nextMetadata = { ...currentMetadata, videoWatchThreshold: payload.videoWatchThreshold };
    await updateCourse(courseId, { metadata: nextMetadata as TCourse['metadata'] }, tx);
  });

  return getCourseVideoRules(courseId);
}
