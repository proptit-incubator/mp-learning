import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('deleting content that learners submitted work for', () => {
  let database: typeof import('@cio/db/drizzle');
  let lessons: typeof import('@cio/core/services/lesson/lesson');
  let exercises: typeof import('@cio/core/services/exercise/exercise');
  let content: typeof import('@cio/core/services/course/content');
  let organizationId: string;
  let courseId: string;
  let lessonId: string;
  let lessonExerciseId: string;
  let freeExerciseId: string;

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('An isolated test database is required');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    lessons = await import('@cio/core/services/lesson/lesson');
    exercises = await import('@cio/core/services/exercise/exercise');
    content = await import('@cio/core/services/course/content');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
    await database.db.insert(database.submissionstatus).values({ id: 1, label: 'Submitted' }).onConflictDoNothing();
  }, 30000);

  beforeEach(async () => {
    organizationId = randomUUID();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Delete protection' });
    const [group] = await database.db.insert(database.group).values({ organizationId, name: 'Group' }).returning();
    const [course] = await database.db
      .insert(database.course)
      .values({ title: 'Training', description: 'Training', groupId: group.id })
      .returning();
    courseId = course.id;
    const [lesson] = await database.db
      .insert(database.lesson)
      .values({ courseId, title: 'Lesson', slug: randomUUID(), order: 1 })
      .returning();
    lessonId = lesson.id;
    const [lessonExercise] = await database.db
      .insert(database.exercise)
      .values({ lessonId, title: 'Lesson quiz', slug: randomUUID(), order: 1 })
      .returning();
    lessonExerciseId = lessonExercise.id;
    const [freeExercise] = await database.db
      .insert(database.exercise)
      .values({ courseId, title: 'Final quiz', slug: randomUUID(), order: 2 })
      .returning();
    freeExerciseId = freeExercise.id;
    const [member] = await database.db
      .insert(database.groupmember)
      .values({ groupId: group.id, roleId: 3, email: `${randomUUID()}@example.com` })
      .returning();
    await database.db.insert(database.submission).values([
      { exerciseId: lessonExerciseId, submittedBy: member.id, courseId },
      { exerciseId: freeExerciseId, submittedBy: member.id, courseId }
    ]);
  });

  it('refuses to delete a lesson whose exercise has submissions, unless forced', async () => {
    await expect(lessons.deleteLessonService(lessonId)).rejects.toMatchObject({ statusCode: 409 });
    await expect(lessons.deleteLessonService(lessonId, { force: true })).resolves.toMatchObject({ id: lessonId });
  });

  it('refuses to delete an exercise with submissions', async () => {
    await expect(exercises.deleteExerciseForCourseService(courseId, freeExerciseId)).rejects.toMatchObject({
      statusCode: 409
    });
  });

  it('refuses a content delete that would remove submitted work and keeps everything', async () => {
    await expect(
      content.deleteCourseContent(courseId, { items: [{ id: lessonId, type: 'LESSON' }] } as never)
    ).rejects.toMatchObject({ statusCode: 409 });

    const [remaining] = await database.db
      .select({ id: database.lesson.id })
      .from(database.lesson)
      .where(database.eq(database.lesson.id, lessonId));
    expect(remaining?.id).toBe(lessonId);
  });
});
