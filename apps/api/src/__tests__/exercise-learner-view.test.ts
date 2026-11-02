import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  canAccessCourseSubmissions: vi.fn(),
  getGroupMemberIdByCourseAndProfile: vi.fn(),
  countSubmissionAttempts: vi.fn()
}));

vi.mock('@cio/db/queries/group', () => ({
  canAccessCourseSubmissions: mocks.canAccessCourseSubmissions,
  getGroupMemberIdByCourseAndProfile: mocks.getGroupMemberIdByCourseAndProfile
}));
vi.mock('@cio/db/queries/submission', () => ({ countSubmissionAttempts: mocks.countSubmissionAttempts }));

import { canRevealAnswers, prepareExerciseForViewer } from '@api/services/exercise/learner-view';

const rules = {
  answerVisibility: 'after_completion' as const,
  allowMultipleAttempts: true,
  maxAttempts: null as number | null,
  completionPolicy: 'passed',
  isComplete: false
};

const question = () => ({
  id: 1,
  settings: { correctValue: true },
  options: [
    { id: 1, label: 'Đúng', isCorrect: true },
    { id: 2, label: 'Sai', isCorrect: false }
  ]
});

const exercise = (overrides: Partial<typeof rules> = {}) => ({
  id: 'exercise-1',
  ...rules,
  ...overrides,
  questions: [question()],
  sections: [{ id: 'section-1', questions: [question()] }]
});

describe('canRevealAnswers', () => {
  it.each([
    ['before any submission', {}, 0, false],
    ['never, even after passing', { answerVisibility: 'never', isComplete: true }, 3, false],
    ['right after a submission', { answerVisibility: 'after_submit' }, 1, true],
    ['a passed exercise', { isComplete: true }, 1, true],
    ['a failed attempt with retakes left', {}, 1, false],
    ['the last allowed attempt', { maxAttempts: 2 }, 2, true],
    ['a single-attempt exercise', { allowMultipleAttempts: false }, 1, true],
    ['a submitted-policy exercise with retakes left', { completionPolicy: 'submitted', isComplete: true }, 1, false]
  ] as const)('handles %s', (_label, overrides, attemptsUsed, expected) => {
    expect(canRevealAnswers({ ...rules, ...overrides }, attemptsUsed)).toBe(expected);
  });
});

describe('prepareExerciseForViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canAccessCourseSubmissions.mockResolvedValue(false);
    mocks.getGroupMemberIdByCourseAndProfile.mockResolvedValue('member-1');
    mocks.countSubmissionAttempts.mockResolvedValue(1);
  });

  it('gives the course team the full answer key', async () => {
    mocks.canAccessCourseSubmissions.mockResolvedValue(true);

    const prepared = await prepareExerciseForViewer(exercise(), 'course-1', 'tutor');

    expect(prepared.answersRevealed).toBe(true);
    expect(prepared.questions?.[0]?.options[0]?.isCorrect).toBe(true);
    expect(mocks.countSubmissionAttempts).not.toHaveBeenCalled();
  });

  it('removes answer keys from questions and section questions while a learner can still retake', async () => {
    const prepared = await prepareExerciseForViewer(exercise({ maxAttempts: 3 }), 'course-1', 'learner');

    expect(prepared).toMatchObject({ answersRevealed: false, attemptsUsed: 1, attemptsRemaining: 2 });
    for (const shown of [prepared.questions?.[0], prepared.sections?.[0]?.questions[0]]) {
      expect(shown?.options.every((option) => option.isCorrect === false)).toBe(true);
      expect(shown?.settings).not.toHaveProperty('correctValue');
    }
  });

  it('reveals answers to a learner once they have passed', async () => {
    const prepared = await prepareExerciseForViewer(exercise({ isComplete: true }), 'course-1', 'learner');

    expect(prepared.answersRevealed).toBe(true);
    expect(prepared.questions?.[0]?.options[0]?.isCorrect).toBe(true);
  });
});
