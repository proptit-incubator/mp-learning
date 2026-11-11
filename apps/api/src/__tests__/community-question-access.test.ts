import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context, Next } from 'hono';

vi.mock('@cio/db/queries/community', () => ({
  createCommunityQuestion: vi.fn(),
  deleteCommentById: vi.fn(),
  deleteCommentByQuestionId: vi.fn(),
  deleteQuestionByQuestionId: vi.fn(),
  editCommunityQuestion: vi.fn(),
  getCommunityQuestion: vi.fn(),
  getCommunityQuestions: vi.fn(),
  getQuestionAuthorAndCourse: vi.fn(),
  submitComment: vi.fn(),
  upvoteAnswer: vi.fn(),
  upvoteQuestion: vi.fn()
}));
vi.mock('@cio/db/queries/course', () => ({ getEnrolledCourses: vi.fn(), getOrgCourses: vi.fn() }));
vi.mock('@cio/db/queries/group', () => ({ isCourseTeamMemberOrOrgAdmin: vi.fn() }));
vi.mock('@cio/db/queries/organization', () => ({ isUserOrgAdmin: vi.fn() }));

import { editCommunityQuestion, getQuestionAuthorAndCourse } from '@cio/db/queries/community';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import { isUserOrgAdmin } from '@cio/db/queries/organization';
import { questionAuthorOrTeamMiddleware } from '@api/routes/community/middlewares/question-author-or-team';
import { editQuestion } from '@api/services/community';
import { ZCommunityQuestionUpdate } from '@cio/utils/validation/community';

function context(userId: string) {
  return {
    get: (key: string) => (key === 'user' ? { id: userId } : undefined),
    req: { param: () => '7' },
    json: vi.fn((body: unknown, status: number) => ({ body, status }))
  } as unknown as Context & { json: ReturnType<typeof vi.fn> };
}

const questionWithoutCourse = { id: 7, authorId: 'author-1', courseId: null, organizationId: 'org-1' };

describe('community questions without a course', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQuestionAuthorAndCourse).mockResolvedValue(questionWithoutCourse as never);
  });

  it('accepts an edit that keeps the question outside any course', async () => {
    const parsed = ZCommunityQuestionUpdate.safeParse({ title: 'Câu hỏi', body: 'Nội dung' });

    await editQuestion({ id: 7, title: 'Câu hỏi', body: 'Nội dung', courseId: undefined });

    expect(parsed.success).toBe(true);
    expect(editCommunityQuestion).toHaveBeenCalledWith({
      id: 7,
      title: 'Câu hỏi',
      body: 'Nội dung',
      courseId: undefined
    });
  });

  it('lets the author through without a course lookup', async () => {
    const next = vi.fn() as unknown as Next;

    await questionAuthorOrTeamMiddleware(context('author-1'), next);

    expect(next).toHaveBeenCalled();
    expect(isCourseTeamMemberOrOrgAdmin).not.toHaveBeenCalled();
  });

  it('lets an organization admin moderate and refuses other employees', async () => {
    vi.mocked(isUserOrgAdmin).mockImplementation(async (_orgId, profileId) => profileId === 'admin-1');
    const adminNext = vi.fn() as unknown as Next;
    const employeeNext = vi.fn() as unknown as Next;
    const employee = context('employee-1');

    await questionAuthorOrTeamMiddleware(context('admin-1'), adminNext);
    await questionAuthorOrTeamMiddleware(employee, employeeNext);

    expect(adminNext).toHaveBeenCalled();
    expect(employeeNext).not.toHaveBeenCalled();
    expect(employee.json).toHaveBeenCalledWith(expect.anything(), 403);
    expect(isUserOrgAdmin).toHaveBeenCalledWith('org-1', 'employee-1');
  });
});
