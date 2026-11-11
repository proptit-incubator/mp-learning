import { describe, expect, it } from 'vitest';
import { getLessonCompletionState } from './lesson-completion-state';

const lesson = (overrides: { isComplete?: boolean; completionPolicy?: string | null } = {}) => ({
  id: 'lesson-1',
  type: 'LESSON',
  isComplete: false,
  completionPolicy: 'manual',
  ...overrides
});

const stateOf = (contentItem: ReturnType<typeof lesson>, lockReason: string | null = null) =>
  getLessonCompletionState({ contentItem, isLearnerView: true, lockReason });

describe('getLessonCompletionState', () => {
  it('offers marking an open, unfinished manual lesson complete', () => {
    expect(stateOf(lesson()).canMarkComplete).toBe(true);
  });

  it('offers nothing once the lesson is complete, so mobile and desktop both stop at done', () => {
    expect(stateOf(lesson({ isComplete: true }))).toMatchObject({ isLessonComplete: true, canMarkComplete: false });
  });

  it('never offers marking a locked or video-watch lesson', () => {
    expect(stateOf(lesson(), 'sequential').canMarkComplete).toBe(false);
    expect(stateOf(lesson({ completionPolicy: 'video_watch' })).canMarkComplete).toBe(false);
  });
});
