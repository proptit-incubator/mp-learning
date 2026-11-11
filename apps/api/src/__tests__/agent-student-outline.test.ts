import { describe, expect, it, vi } from 'vitest';

vi.mock('@cio/db/drizzle', () => ({ db: {} }));
vi.mock('@cio/core/services/lesson/lesson', () => ({ getLesson: vi.fn() }));
vi.mock('@cio/core/services/agent/lesson-transcript', () => ({ getLessonVideoTranscript: vi.fn() }));
vi.mock('@cio/core/services/exercise/exercise', () => ({ getExercise: vi.fn() }));
vi.mock('@cio/core/services/course/outline', () => ({ getCourseOutlineSummary: vi.fn() }));
vi.mock('@api/services/submission/student-submission', () => ({ getStudentSubmissionReview: vi.fn() }));
vi.mock('@cio/core/utils/tinybird', () => ({ AgentEvent: {}, trackAgentEvent: vi.fn() }));
vi.mock('@cio/core/services/agent/chat-context', () => ({
  verifyExerciseBelongsToCourse: vi.fn(),
  verifyLessonBelongsToCourse: vi.fn()
}));
vi.mock('@api/services/course/access', () => ({
  assertEnrolledStudentContentAccess: vi.fn(),
  getLockedContentIds: vi.fn()
}));

import { getCourseOutlineSummary } from '@cio/core/services/course/outline';
import { getLockedContentIds } from '@api/services/course/access';
import { buildStudentAgentTools } from '@api/services/agent/student-tools';

describe('list_course_outline', () => {
  it('marks the items the learner cannot open yet', async () => {
    vi.mocked(getCourseOutlineSummary).mockResolvedValue([
      {
        kind: 'section',
        id: 'section-1',
        title: 'Phần 1',
        items: [
          { type: 'LESSON', id: 'lesson-1', title: 'Bài mở' },
          { type: 'LESSON', id: 'lesson-2', title: 'Bài khóa' }
        ]
      },
      { kind: 'item', type: 'EXERCISE', id: 'exercise-1', title: 'Bài tập khóa' }
    ] as never);
    vi.mocked(getLockedContentIds).mockResolvedValue(new Set(['lesson-2', 'exercise-1']));

    const tools = buildStudentAgentTools('org-1', 'learner-1', 'course-1', {} as never);
    const result = (await tools.list_course_outline.execute!({}, { toolCallId: 'call-1', messages: [] })) as {
      outline: Array<{ id: string; locked?: boolean; items?: Array<{ id: string; locked: boolean }> }>;
    };

    expect(getLockedContentIds).toHaveBeenCalledWith('course-1', 'learner-1');
    expect(result.outline[0].items).toEqual([
      expect.objectContaining({ id: 'lesson-1', locked: false }),
      expect.objectContaining({ id: 'lesson-2', locked: true })
    ]);
    expect(result.outline[1]).toEqual(expect.objectContaining({ id: 'exercise-1', locked: true }));
  });
});
