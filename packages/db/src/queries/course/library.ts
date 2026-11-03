import { and, asc, count, desc, eq, not, or, sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import { learnerAccessSql } from './enrollment';
import { ROLE } from '@cio/utils/constants';
import { isSelfEnrollmentAllowed, resolveCourseBannerImage } from '@cio/utils/functions';
import { foldVietnamese, VIETNAMESE_ACCENTED, VIETNAMESE_PLAIN } from '@cio/utils/functions/vietnamese';

export function courseLearningMembershipSql(profileId: string) {
  return learnerAccessSql(sql`${schema.course.id}`, profileId);
}

export function courseLibraryAccessSql(profileId: string) {
  const membership = courseLearningMembershipSql(profileId);
  return sql<boolean>`(${membership} or exists (
    select 1 from ${schema.organizationmember} as library_admin
    where library_admin.organization_id = ${schema.group.organizationId}
      and library_admin.profile_id = ${profileId} and library_admin.role_id = ${ROLE.ADMIN}
      and library_admin.status = 'ACTIVE'
  ))`;
}

function courseLibraryVisibilitySql() {
  return sql<boolean>`COALESCE(
    ${schema.course.metadata}->>'allowSelfEnrollment', ${schema.course.metadata}->>'allowNewStudent', 'true') = 'true'`;
}

export async function getCourseLibrary(
  organizationId: string,
  profileId: string,
  options: {
    courseId?: string;
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    recommended?: boolean;
  } = {},
  client: DbOrTxClient = db
) {
  const membership = courseLearningMembershipSql(profileId);
  const access = courseLibraryAccessSql(profileId);
  const visibility = courseLibraryVisibilitySql();
  const search = options.search ? foldVietnamese(options.search.trim()) : '';
  const searchPattern = search ? `%${search.replace(/[\\%_]/g, '\\$&')}%` : undefined;
  const folded = (column: SQL) =>
    sql`lower(translate(coalesce(${column}, ''), ${VIETNAMESE_ACCENTED}, ${VIETNAMESE_PLAIN}))`;
  const conditions = and(
    eq(schema.group.organizationId, organizationId),
    eq(schema.course.status, 'ACTIVE'),
    eq(schema.course.isPublished, true),
    eq(schema.course.isTemplate, false),
    or(visibility, membership),
    options.courseId ? eq(schema.course.id, options.courseId) : undefined,
    searchPattern
      ? or(
          sql`${folded(sql`${schema.course.title}`)} like ${searchPattern}`,
          sql`${folded(sql`${schema.course.description}`)} like ${searchPattern}`
        )
      : undefined,
    options.recommended ? not(access) : undefined
  );
  const lessonCount = sql<number>`(select count(*) from ${schema.lesson} as library_lesson
    where library_lesson.course_id = ${schema.course.id})`.mapWith(Number);
  const exerciseCount = sql<number>`(select count(*) from ${schema.exercise} as library_exercise
    left join ${schema.lesson} as library_exercise_lesson on library_exercise_lesson.id = library_exercise.lesson_id
    where library_exercise.course_id = ${schema.course.id} or library_exercise_lesson.course_id = ${schema.course.id})`.mapWith(
    Number
  );
  const sortColumn =
    options.sort === 'lessons'
      ? lessonCount
      : options.sort === 'last_updated_at'
        ? sql`COALESCE(${schema.course.updatedAt}, ${schema.course.createdAt})`
        : schema.course.createdAt;
  const limit = options.limit ?? 12;
  const offset = ((options.page ?? 1) - 1) * limit;
  const [rows, totals] = await Promise.all([
    client
      .select({
        id: schema.course.id,
        title: schema.course.title,
        description: schema.course.description,
        bannerImage: schema.course.bannerImage,
        logo: schema.course.logo,
        metadata: schema.course.metadata,
        recertificationMonths: schema.course.recertificationMonths,
        lessonCount,
        exerciseCount,
        isEnrolled: membership,
        hasAccess: access
      })
      .from(schema.course)
      .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
      .where(conditions)
      .orderBy(desc(sortColumn), asc(schema.course.id))
      .limit(limit)
      .offset(offset),
    client
      .select({ total: count() })
      .from(schema.course)
      .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
      .where(conditions)
  ]);
  const data = rows.map((row) => {
    const bannerImage = resolveCourseBannerImage(row);
    const canSelfEnroll = !row.hasAccess && isSelfEnrollmentAllowed(row.metadata);
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      bannerImage,
      recertificationMonths: row.recertificationMonths,
      lessonCount: row.lessonCount,
      exerciseCount: row.exerciseCount,
      goals: row.metadata.goals ?? '',
      requirements: row.metadata.requirements ?? '',
      isEnrolled: row.isEnrolled,
      hasAccess: row.hasAccess,
      canSelfEnroll
    };
  });
  return { data, total: totals[0]?.total ?? 0 };
}

export async function lockCourseForEnrollment(courseId: string, client: DbOrTxClient) {
  const [course] = await client.select().from(schema.course).where(eq(schema.course.id, courseId)).for('update');
  return course ?? null;
}
