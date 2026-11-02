import * as schema from '@db/schema';
import { and, db, eq, inArray, or, sql, type DbOrTxClient } from '@db/drizzle';

export type TCourseContentRefs = {
  lessonIds?: readonly string[];
  sectionIds?: readonly string[];
  exerciseIds?: readonly string[];
  newsfeedIds?: readonly string[];
  groupMemberIds?: readonly string[];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function distinctIds(ids: readonly string[] | undefined): string[] {
  return [...new Set(ids ?? [])];
}

async function countLessonsInCourse(courseId: string, lessonIds: string[], client: DbOrTxClient) {
  const [row] = await client
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.lesson)
    .where(and(eq(schema.lesson.courseId, courseId), inArray(schema.lesson.id, lessonIds)));
  return row?.total ?? 0;
}

async function countSectionsInCourse(courseId: string, sectionIds: string[], client: DbOrTxClient) {
  const [row] = await client
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.courseSection)
    .where(and(eq(schema.courseSection.courseId, courseId), inArray(schema.courseSection.id, sectionIds)));
  return row?.total ?? 0;
}

async function countExercisesInCourse(courseId: string, exerciseIds: string[], client: DbOrTxClient) {
  const [row] = await client
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.exercise)
    .leftJoin(schema.lesson, eq(schema.lesson.id, schema.exercise.lessonId))
    .where(
      and(
        inArray(schema.exercise.id, exerciseIds),
        or(eq(schema.exercise.courseId, courseId), eq(schema.lesson.courseId, courseId))
      )
    );
  return row?.total ?? 0;
}

async function countNewsfeedItemsInCourse(courseId: string, newsfeedIds: string[], client: DbOrTxClient) {
  const [row] = await client
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.courseNewsfeed)
    .where(and(eq(schema.courseNewsfeed.courseId, courseId), inArray(schema.courseNewsfeed.id, newsfeedIds)));
  return row?.total ?? 0;
}

async function countGroupMembersInCourse(courseId: string, groupMemberIds: string[], client: DbOrTxClient) {
  const [row] = await client
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.groupmember)
    .innerJoin(schema.course, eq(schema.course.groupId, schema.groupmember.groupId))
    .where(and(eq(schema.course.id, courseId), inArray(schema.groupmember.id, groupMemberIds)));
  return row?.total ?? 0;
}

/**
 * Returns true only when every referenced lesson, section, exercise, newsfeed item and group member
 * exists and belongs to `courseId`. Malformed ids count as outside the course.
 */
export async function areCourseContentRefsInCourse(
  courseId: string,
  refs: TCourseContentRefs,
  client: DbOrTxClient = db
): Promise<boolean> {
  try {
    const lessonIds = distinctIds(refs.lessonIds);
    const sectionIds = distinctIds(refs.sectionIds);
    const exerciseIds = distinctIds(refs.exerciseIds);
    const newsfeedIds = distinctIds(refs.newsfeedIds);
    const groupMemberIds = distinctIds(refs.groupMemberIds);
    const allIds = [courseId, ...lessonIds, ...sectionIds, ...exerciseIds, ...newsfeedIds, ...groupMemberIds];
    if (allIds.some((id) => !UUID_PATTERN.test(id))) return false;

    const checks = [
      { ids: lessonIds, count: countLessonsInCourse },
      { ids: sectionIds, count: countSectionsInCourse },
      { ids: exerciseIds, count: countExercisesInCourse },
      { ids: newsfeedIds, count: countNewsfeedItemsInCourse },
      { ids: groupMemberIds, count: countGroupMembersInCourse }
    ].filter((check) => check.ids.length > 0);

    const matchedCounts = await Promise.all(checks.map((check) => check.count(courseId, check.ids, client)));

    return checks.every((check, index) => matchedCounts[index] === check.ids.length);
  } catch (error) {
    console.error('areCourseContentRefsInCourse error:', error);
    throw new Error('Failed to verify course content references');
  }
}
