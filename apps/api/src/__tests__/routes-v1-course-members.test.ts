import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/services/v1/courses/members', () => ({
  listCourseMembersService: vi.fn(),
  addCourseMemberService: vi.fn(),
  getCourseMemberService: vi.fn(),
  updateCourseMemberService: vi.fn(),
  deleteCourseMemberService: vi.fn(),
  resetCourseMemberProgressService: vi.fn(),
  getCourseMemberAnalyticsService: vi.fn()
}));

vi.mock('@api/services/v1/shared', () => ({
  assertCourseBelongsToOrganization: vi.fn(),
  assertCourseTeamMemberOrOrgAdmin: vi.fn()
}));

import { Hono } from '@api/utils/hono';
import {
  addCourseMemberService,
  deleteCourseMemberService,
  listCourseMembersService,
  updateCourseMemberService
} from '@api/services/v1/courses/members';
import { v1CoursesRouter } from '@api/routes/v1/courses';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';

const emptyPage = { items: [], page: 1, limit: 20, total: 0, totalPages: 0 };

const app = new Hono()
  .use('*', async (c, next) => {
    c.set('orgId', 'org-1');
    c.set('actorId', 'actor-1');
    await next();
  })
  .route('/', v1CoursesRouter);

const jsonRequest = (method: string, body: unknown) => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
});

describe('v1CoursesRouter nested course-member mounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists members with the actor and returns the paginated envelope', async () => {
    vi.mocked(listCourseMembersService).mockResolvedValue(
      emptyPage as Awaited<ReturnType<typeof listCourseMembersService>>
    );

    const response = await app.request(`/${COURSE_ID}/members`);

    expect(response.status).toBe(200);
    expect(listCourseMembersService).toHaveBeenCalledWith(
      'org-1',
      'actor-1',
      { courseId: COURSE_ID },
      expect.objectContaining({ page: 1, limit: 20 })
    );
    expect(await response.json()).toEqual({
      success: true,
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
    });
  });

  it('adds a member with the actor and returns 201 with the member', async () => {
    vi.mocked(addCourseMemberService).mockResolvedValue({ id: MEMBER_ID } as Awaited<
      ReturnType<typeof addCourseMemberService>
    >);

    const response = await app.request(
      `/${COURSE_ID}/members`,
      jsonRequest('POST', { roleId: 3, email: 'student@example.com' })
    );

    expect(response.status).toBe(201);
    expect(addCourseMemberService).toHaveBeenCalledWith(
      'org-1',
      'actor-1',
      { courseId: COURSE_ID },
      { roleId: 3, email: 'student@example.com' },
      expect.any(String),
      null
    );
    expect(await response.json()).toEqual({ success: true, data: { id: MEMBER_ID } });
  });

  it('rejects adding a member with neither profileId nor email', async () => {
    const response = await app.request(`/${COURSE_ID}/members`, jsonRequest('POST', { roleId: 3 }));

    expect(response.status).toBe(400);
    expect(addCourseMemberService).not.toHaveBeenCalled();
  });

  it('updates and deletes a member with the actor', async () => {
    vi.mocked(updateCourseMemberService).mockResolvedValue({ id: MEMBER_ID } as Awaited<
      ReturnType<typeof updateCourseMemberService>
    >);
    vi.mocked(deleteCourseMemberService).mockResolvedValue({ id: MEMBER_ID } as Awaited<
      ReturnType<typeof deleteCourseMemberService>
    >);

    const updated = await app.request(`/${COURSE_ID}/members/${MEMBER_ID}`, jsonRequest('PUT', { roleId: 2 }));
    const deleted = await app.request(`/${COURSE_ID}/members/${MEMBER_ID}`, { method: 'DELETE' });

    expect(updated.status).toBe(200);
    expect(updateCourseMemberService).toHaveBeenCalledWith(
      'org-1',
      'actor-1',
      { courseId: COURSE_ID, memberId: MEMBER_ID },
      { roleId: 2 }
    );
    expect(deleted.status).toBe(200);
    expect(deleteCourseMemberService).toHaveBeenCalledWith('org-1', 'actor-1', {
      courseId: COURSE_ID,
      memberId: MEMBER_ID
    });
  });

  it('rejects an empty member update with a 400', async () => {
    const response = await app.request(`/${COURSE_ID}/members/${MEMBER_ID}`, jsonRequest('PUT', {}));

    expect(response.status).toBe(400);
    expect(updateCourseMemberService).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID courseId with a validation error, not a 404 route miss', async () => {
    const response = await app.request('/not-a-uuid/members');

    expect(response.status).toBe(400);
    expect(listCourseMembersService).not.toHaveBeenCalled();
  });
});
