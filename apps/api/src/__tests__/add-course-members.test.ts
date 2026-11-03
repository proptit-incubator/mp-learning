import { describe, expect, it, vi } from 'vitest';

vi.mock('@cio/db/queries/course/people', () => ({
  getCourseMember: vi.fn(),
  getCourseMembers: vi.fn(),
  addCourseMember: vi.fn(),
  deleteCourseMember: vi.fn(),
  updateCourseMember: vi.fn(),
  getCourseTeachers: vi.fn()
}));

vi.mock('@cio/db/queries/course', () => ({
  getCourseWithOrgData: vi.fn(),
  getOrgIdByCourseId: vi.fn().mockResolvedValue('org-1')
}));

vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({
  invalidateOrgStats: vi.fn()
}));

import { ROLE } from '@cio/utils/constants';
import { getCourseMember, updateCourseMember } from '@cio/db/queries/course/people';
import { updateMember } from '@api/services/course/people';

const uniqueViolation = new Error('Failed to add course member: duplicate key', {
  cause: { name: 'DrizzleQueryError', cause: { code: '23505', constraint_name: 'unique_group_email' } }
});

describe('changing a member email to one already in the course', () => {
  it('updateMember returns 409 instead of a 500', async () => {
    vi.mocked(getCourseMember).mockResolvedValue({ id: 'member-1', roleId: ROLE.STUDENT } as Awaited<
      ReturnType<typeof getCourseMember>
    >);
    vi.mocked(updateCourseMember).mockRejectedValue(uniqueViolation);

    await expect(updateMember('course-1', 'member-1', { email: 'taken@example.com' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT'
    });
  });
});

describe('course instructors', () => {
  it('refuses to turn a learner into a course instructor', async () => {
    vi.mocked(getCourseMember).mockResolvedValue({ id: 'member-1', roleId: ROLE.STUDENT } as Awaited<
      ReturnType<typeof getCourseMember>
    >);
    vi.mocked(updateCourseMember).mockReset();

    await expect(updateMember('course-1', 'member-1', { roleId: ROLE.TUTOR })).rejects.toMatchObject({
      statusCode: 400
    });
    expect(updateCourseMember).not.toHaveBeenCalled();
  });
});
