import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context, Next } from 'hono';
import { Hono } from '@api/utils/hono';
import type { TCourseContentRefs } from '@cio/db/queries/course/content-scope';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';
const SECTION_ID = '33333333-3333-4333-8333-333333333333';
const EXERCISE_ID = '44444444-4444-4444-8444-444444444444';
const STUDENT_ID = '55555555-5555-4555-8555-555555555555';
const FOREIGN_ID = '99999999-9999-4999-8999-999999999999';

const access = vi.hoisted(() => ({
  isUserCourseMemberOrOrgAdmin: vi.fn(),
  isCourseTeamMemberOrOrgAdmin: vi.fn(),
  getGroupMemberIdByCourseAndProfile: vi.fn(),
  areCourseContentRefsInCourse: vi.fn(),
  getLessonCommentOwnership: vi.fn()
}));

const services = vi.hoisted(() => ({
  createLesson: vi.fn(),
  updateLessonService: vi.fn(),
  deleteLessonService: vi.fn(),
  getLesson: vi.fn(),
  getLessonWatchProgressService: vi.fn(),
  hideLessonRecordingsFromLearners: vi.fn(),
  releaseLessonRecordingsForViewer: vi.fn(),
  updateLessonCommentService: vi.fn(),
  deleteLessonCommentService: vi.fn(),
  createCourseSection: vi.fn(),
  updateCourseSectionService: vi.fn(),
  deleteCourseSectionService: vi.fn(),
  reorderCourseSections: vi.fn(),
  promoteUngroupedSection: vi.fn(),
  createExercise: vi.fn(),
  updateExerciseService: vi.fn(),
  deleteExerciseForCourseService: vi.fn(),
  upsertAttendance: vi.fn(),
  upsertLessonLanguageService: vi.fn()
}));

vi.mock('@api/middlewares/auth', () => ({
  authMiddleware: async (context: Context, next: Next) => {
    context.set('user', { id: context.req.header('x-test-profile') ?? 'profile-1' });
    context.set('session', { id: 'session-1' });
    await next();
  }
}));
vi.mock('@api/middlewares/auth-or-automation-key', () => ({
  authOrAutomationKeyMiddleware: async (context: Context, next: Next) => {
    context.set('user', { id: context.req.header('x-test-profile') ?? 'profile-1' });
    await next();
  }
}));
vi.mock('@cio/db/queries/group', () => ({
  isUserCourseMemberOrOrgAdmin: access.isUserCourseMemberOrOrgAdmin,
  isCourseTeamMemberOrOrgAdmin: access.isCourseTeamMemberOrOrgAdmin,
  getGroupMemberIdByCourseAndProfile: access.getGroupMemberIdByCourseAndProfile
}));
vi.mock('@cio/db/queries/course/content-scope', () => ({
  areCourseContentRefsInCourse: access.areCourseContentRefsInCourse
}));
vi.mock('@cio/db/queries/lesson', () => ({ getLessonCommentOwnership: access.getLessonCommentOwnership }));
vi.mock('@cio/db/queries/tag', () => ({ getCourseOrganizationId: vi.fn().mockResolvedValue('org-1') }));
vi.mock('@cio/db/queries/course/course', () => ({
  getCourseById: vi.fn().mockResolvedValue([]),
  getCourseProgress: vi.fn().mockResolvedValue({ roleId: 3 })
}));
vi.mock('@cio/db/queries/course/content', () => ({ getCourseContentItems: vi.fn().mockResolvedValue([]) }));
vi.mock('@cio/db/queries/attendance', () => ({
  upsertAttendance: services.upsertAttendance,
  getAttendanceByCourseId: vi.fn(),
  getAttendanceByStudentAndLesson: vi.fn()
}));
vi.mock('@cio/core/services/course/progression', () => ({ assertStudentCanAccessContent: vi.fn() }));
vi.mock('@api/services/organization/automation-key', () => ({ organizationApiKeyHasScopes: vi.fn() }));
vi.mock('@api/services/organization/automation-usage', () => ({}));
vi.mock('@api/services/lesson', () => services);
vi.mock('@api/services/course/completion', () => ({ evaluateCourseCertification: vi.fn() }));
vi.mock('@api/services/course/notify-session', () => ({}));
vi.mock('@api/services/course/notify-exercise', () => ({}));
vi.mock('@api/utils/lesson', () => ({}));
vi.mock('@cio/core/services/course/course', () => ({ ensureCourseGroupMemberId: vi.fn() }));
vi.mock('@cio/core/services/course/section', () => services);
vi.mock('@cio/core/services/exercise/exercise', () => services);
vi.mock('@cio/core/services/lesson-language', () => services);
vi.mock('@api/services/exercise/template', () => ({}));
vi.mock('@api/services/exercise/video-recording', () => ({}));
vi.mock('@api/services/submission', () => ({}));

import { attendanceRouter } from '@api/routes/course/attendance';
import { exerciseRouter } from '@api/routes/course/exercise';
import { lessonRouter } from '@api/routes/course/lesson';
import { sectionRouter } from '@api/routes/course/section';

const app = new Hono()
  .route('/course/:courseId/lesson', lessonRouter)
  .route('/course/:courseId/section', sectionRouter)
  .route('/course/:courseId/exercise', exerciseRouter)
  .route('/course/:courseId/attendance', attendanceRouter);

type Role = 'learner' | 'tutor';

function send(role: Role, method: string, path: string, body?: unknown) {
  return app.request(`/course/${COURSE_ID}${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-test-profile': role },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function refsContainForeignId(refs: TCourseContentRefs) {
  return Object.values(refs).some((ids: readonly string[] | undefined) => ids?.includes(FOREIGN_ID));
}

const contentWrites: Array<[string, string, unknown?]> = [
  ['POST', '/lesson', { title: 'Lesson', courseId: COURSE_ID, order: 1 }],
  ['PUT', `/lesson/${LESSON_ID}`, { title: 'Changed' }],
  ['DELETE', `/lesson/${LESSON_ID}`],
  ['POST', `/lesson/${LESSON_ID}/language`, { locale: 'vi', content: 'x' }],
  ['POST', '/section', { title: 'Section', courseId: COURSE_ID, order: 1 }],
  ['PUT', `/section/${SECTION_ID}`, { title: 'Changed' }],
  ['DELETE', `/section/${SECTION_ID}`],
  ['POST', '/section/reorder', { sections: [{ id: SECTION_ID, order: 1 }] }],
  ['POST', '/exercise', { title: 'Quiz', courseId: COURSE_ID, order: 1 }],
  ['PUT', `/exercise/${EXERCISE_ID}`, { title: 'Changed' }],
  ['DELETE', `/exercise/${EXERCISE_ID}`],
  ['POST', '/attendance', { courseId: COURSE_ID, lessonId: LESSON_ID, studentId: STUDENT_ID, isPresent: true }]
];

describe('course content authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    access.isUserCourseMemberOrOrgAdmin.mockResolvedValue(true);
    access.isCourseTeamMemberOrOrgAdmin.mockImplementation(async (_courseId: string, profileId: string) => {
      return profileId === 'tutor';
    });
    access.areCourseContentRefsInCourse.mockImplementation(async (_courseId: string, refs: TCourseContentRefs) => {
      return !refsContainForeignId(refs);
    });
    for (const mock of Object.values(services)) mock.mockResolvedValue({ id: 'result' });
    services.hideLessonRecordingsFromLearners.mockImplementation(
      async (_c: string, _p: string, rows: unknown[]) => rows
    );
    services.releaseLessonRecordingsForViewer.mockImplementation(
      async (_c: string, _p: string, rows: unknown[]) => rows
    );
  });

  it.each(contentWrites)('rejects a learner calling %s %s', async (method, path, body) => {
    const response = await send('learner', method, path, body);

    expect(response.status).toBe(403);
    for (const mock of Object.values(services)) expect(mock).not.toHaveBeenCalled();
  });

  it.each([
    ['PUT', `/lesson/${FOREIGN_ID}`, { title: 'Changed' }],
    ['DELETE', `/lesson/${FOREIGN_ID}`],
    ['PUT', `/lesson/${LESSON_ID}`, { sectionId: FOREIGN_ID }],
    ['DELETE', `/section/${FOREIGN_ID}`],
    ['POST', '/section/reorder', { sections: [{ id: FOREIGN_ID, order: 1 }] }],
    ['POST', '/exercise', { title: 'Quiz', courseId: COURSE_ID, order: 1, lessonId: FOREIGN_ID }],
    ['PUT', `/exercise/${FOREIGN_ID}`, { title: 'Changed' }],
    ['PUT', `/exercise/${EXERCISE_ID}`, { sectionId: FOREIGN_ID }],
    ['DELETE', `/exercise/${FOREIGN_ID}`],
    ['POST', '/attendance', { courseId: COURSE_ID, lessonId: LESSON_ID, studentId: FOREIGN_ID, isPresent: true }]
  ] as Array<[string, string, unknown?]>)(
    'rejects a tutor reaching another course with %s %s',
    async (method, path, body) => {
      const response = await send('tutor', method, path, body);

      expect(response.status).toBe(404);
      for (const mock of Object.values(services)) expect(mock).not.toHaveBeenCalled();
    }
  );

  it('lets a tutor edit content of their course', async () => {
    const response = await send('tutor', 'PUT', `/lesson/${LESSON_ID}`, { title: 'Changed', sectionId: SECTION_ID });

    expect(response.status).toBe(200);
    expect(services.updateLessonService).toHaveBeenCalledWith(LESSON_ID, expect.anything(), expect.anything());
  });

  it('writes exercises and attendance to the course in the path, not the body', async () => {
    const otherCourse = '88888888-8888-4888-8888-888888888888';

    const exercise = await send('tutor', 'POST', '/exercise', { title: 'Quiz', courseId: otherCourse, order: 1 });
    const attendance = await send('tutor', 'POST', '/attendance', {
      courseId: otherCourse,
      lessonId: LESSON_ID,
      studentId: STUDENT_ID,
      isPresent: true
    });

    expect(exercise.status).toBe(201);
    expect(services.createExercise).toHaveBeenCalledWith(expect.objectContaining({ courseId: COURSE_ID }));
    expect(attendance.status).toBe(201);
    expect(services.upsertAttendance).toHaveBeenCalledWith(expect.objectContaining({ courseId: COURSE_ID }));
  });

  it('hides a lesson of another course from a learner', async () => {
    const response = await send('learner', 'GET', `/lesson/${FOREIGN_ID}`);

    expect(response.status).toBe(404);
    expect(services.getLesson).not.toHaveBeenCalled();
  });

  describe('lesson comments', () => {
    it('lets the author edit their comment', async () => {
      access.getLessonCommentOwnership.mockResolvedValue({ courseId: COURSE_ID, authorGroupMemberId: 'gm-learner' });
      access.getGroupMemberIdByCourseAndProfile.mockResolvedValue('gm-learner');

      const response = await send('learner', 'PUT', '/lesson/comment/7', { comment: 'Edited' });

      expect(response.status).toBe(200);
      expect(services.updateLessonCommentService).toHaveBeenCalledWith(7, 'Edited');
    });

    it("rejects a learner changing someone else's comment", async () => {
      access.getLessonCommentOwnership.mockResolvedValue({ courseId: COURSE_ID, authorGroupMemberId: 'gm-other' });
      access.getGroupMemberIdByCourseAndProfile.mockResolvedValue('gm-learner');

      const edit = await send('learner', 'PUT', '/lesson/comment/7', { comment: 'Edited' });
      const remove = await send('learner', 'DELETE', '/lesson/comment/7');

      expect(edit.status).toBe(403);
      expect(remove.status).toBe(403);
      expect(services.updateLessonCommentService).not.toHaveBeenCalled();
      expect(services.deleteLessonCommentService).not.toHaveBeenCalled();
    });

    it('lets a tutor moderate comments of their course only', async () => {
      access.getLessonCommentOwnership.mockResolvedValue({ courseId: COURSE_ID, authorGroupMemberId: 'gm-other' });
      const ownCourse = await send('tutor', 'DELETE', '/lesson/comment/7');

      access.getLessonCommentOwnership.mockResolvedValue({ courseId: FOREIGN_ID, authorGroupMemberId: 'gm-other' });
      const otherCourse = await send('tutor', 'DELETE', '/lesson/comment/8');

      expect(ownCourse.status).toBe(200);
      expect(otherCourse.status).toBe(404);
      expect(services.deleteLessonCommentService).toHaveBeenCalledTimes(1);
    });
  });
});
