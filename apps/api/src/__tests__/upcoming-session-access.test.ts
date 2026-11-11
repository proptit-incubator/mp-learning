import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/services/course/access', () => ({ assertEnrolledStudentContentAccess: vi.fn() }));

import { AppError, ErrorCodes } from '@api/utils/errors';
import { assertEnrolledStudentContentAccess } from '@api/services/course/access';
import { hideLockedUpcomingSessions } from '@api/services/course/upcoming-session-access';

const course = (id: string, lessonId: string | null) => ({
  id,
  upcomingSession: lessonId ? { lessonId, callUrl: `https://meet.test/${lessonId}` } : null
});

describe('hideLockedUpcomingSessions', () => {
  beforeEach(() => {
    vi.mocked(assertEnrolledStudentContentAccess).mockReset();
  });

  it('keeps sessions the learner can open and drops locked ones', async () => {
    vi.mocked(assertEnrolledStudentContentAccess).mockImplementation(async ({ contentId }) => {
      if (contentId === 'locked-lesson') throw new AppError('Content is locked', ErrorCodes.VALIDATION_ERROR, 403);
    });

    const result = await hideLockedUpcomingSessions(
      [course('open', 'open-lesson'), course('locked', 'locked-lesson'), course('none', null)],
      'learner-1'
    );

    expect(result.map((item) => item.upcomingSession?.lessonId ?? null)).toEqual(['open-lesson', null, null]);
    expect(assertEnrolledStudentContentAccess).toHaveBeenCalledTimes(2);
    expect(assertEnrolledStudentContentAccess).toHaveBeenCalledWith(
      expect.objectContaining({ courseId: 'locked', profileId: 'learner-1', contentId: 'locked-lesson' })
    );
  });

  it('rethrows unexpected failures', async () => {
    vi.mocked(assertEnrolledStudentContentAccess).mockRejectedValue(new Error('database down'));

    await expect(hideLockedUpcomingSessions([course('open', 'open-lesson')], 'learner-1')).rejects.toThrow(
      'database down'
    );
  });
});
