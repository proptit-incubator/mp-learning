import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('course content scope on isolated PostgreSQL', () => {
  let database: typeof import('@cio/db/drizzle');
  let scope: typeof import('@cio/db/queries/course/content-scope');
  let ownCourse: Awaited<ReturnType<typeof createCourseWithContent>>;
  let otherCourse: Awaited<ReturnType<typeof createCourseWithContent>>;

  async function createCourseWithContent(organizationId: string) {
    const [group] = await database.db.insert(database.group).values({ organizationId, name: 'Group' }).returning();
    const [course] = await database.db
      .insert(database.course)
      .values({ title: 'Training', description: 'Training', groupId: group.id })
      .returning();
    const [section] = await database.db
      .insert(database.courseSection)
      .values({ courseId: course.id, title: 'Section', order: 1 })
      .returning();
    const [lesson] = await database.db
      .insert(database.lesson)
      .values({ courseId: course.id, sectionId: section.id, title: 'Lesson', slug: randomUUID(), order: 1 })
      .returning();
    const [lessonExercise] = await database.db
      .insert(database.exercise)
      .values({ lessonId: lesson.id, title: 'Lesson quiz', slug: randomUUID(), order: 1 })
      .returning();
    const [courseExercise] = await database.db
      .insert(database.exercise)
      .values({ courseId: course.id, sectionId: section.id, title: 'Final quiz', slug: randomUUID(), order: 2 })
      .returning();
    const [feed] = await database.db
      .insert(database.courseNewsfeed)
      .values({ courseId: course.id, content: 'Hello' })
      .returning();
    const [member] = await database.db
      .insert(database.groupmember)
      .values({ groupId: group.id, roleId: 3, email: `${randomUUID()}@example.com` })
      .returning();

    return { course, section, lesson, lessonExercise, courseExercise, feed, member };
  }

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('An isolated test database is required');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    scope = await import('@cio/db/queries/course/content-scope');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();

    const organizationId = randomUUID();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Content scope tests' });
    ownCourse = await createCourseWithContent(organizationId);
    otherCourse = await createCourseWithContent(organizationId);
  }, 30000);

  it('accepts every kind of content that belongs to the course', async () => {
    const isInCourse = await scope.areCourseContentRefsInCourse(ownCourse.course.id, {
      lessonIds: [ownCourse.lesson.id],
      sectionIds: [ownCourse.section.id, ownCourse.section.id],
      exerciseIds: [ownCourse.lessonExercise.id, ownCourse.courseExercise.id],
      newsfeedIds: [ownCourse.feed.id],
      groupMemberIds: [ownCourse.member.id]
    });

    expect(isInCourse).toBe(true);
  });

  it.each(['lessonIds', 'sectionIds', 'exerciseIds', 'newsfeedIds', 'groupMemberIds'] as const)(
    'rejects %s that belong to another course',
    async (key) => {
      const foreignIds = {
        lessonIds: otherCourse.lesson.id,
        sectionIds: otherCourse.section.id,
        exerciseIds: otherCourse.lessonExercise.id,
        newsfeedIds: otherCourse.feed.id,
        groupMemberIds: otherCourse.member.id
      };

      const isInCourse = await scope.areCourseContentRefsInCourse(ownCourse.course.id, { [key]: [foreignIds[key]] });

      expect(isInCourse).toBe(false);
    }
  );

  it('rejects unknown and malformed ids without querying with them', async () => {
    const unknown = await scope.areCourseContentRefsInCourse(ownCourse.course.id, { lessonIds: [randomUUID()] });
    const malformed = await scope.areCourseContentRefsInCourse(ownCourse.course.id, { lessonIds: ['not-a-uuid'] });

    expect(unknown).toBe(false);
    expect(malformed).toBe(false);
  });
});
