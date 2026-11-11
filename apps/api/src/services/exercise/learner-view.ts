import { redactAnswerKey } from '@cio/question-types';
import { canAccessCourseSubmissions, getGroupMemberIdByCourseAndProfile } from '@cio/db/queries/group';
import { countSubmissionAttempts } from '@cio/db/queries/submission';
import type { ExerciseAnswerVisibility } from '@cio/utils/validation/exercise';

type AnswerRevealRules = {
  answerVisibility: ExerciseAnswerVisibility;
  allowMultipleAttempts: boolean;
  maxAttempts: number | null;
  completionPolicy: string;
  isComplete: boolean;
};

type QuestionLike = { settings?: Record<string, unknown>; options?: Array<{ isCorrect?: boolean | null }> };

type ExerciseLike = AnswerRevealRules & {
  id: string;
  questions?: QuestionLike[];
  sections?: Array<{ questions: QuestionLike[] }>;
};

/** Whether a learner who has submitted `attemptsUsed` times may now see the correct answers. */
export function canRevealAnswers(rules: AnswerRevealRules, attemptsUsed: number): boolean {
  if (attemptsUsed === 0 || rules.answerVisibility === 'never') return false;
  if (rules.answerVisibility === 'after_submit') return true;

  const hasUnlimitedAttempts = rules.allowMultipleAttempts && rules.maxAttempts === null;
  const attemptsExhausted =
    !rules.allowMultipleAttempts || (rules.maxAttempts !== null && attemptsUsed >= rules.maxAttempts);
  const completionCountsAsDone = rules.completionPolicy === 'passed' || hasUnlimitedAttempts;

  return attemptsExhausted || (rules.isComplete && completionCountsAsDone);
}

function remainingAttempts(rules: AnswerRevealRules, attemptsUsed: number): number | null {
  const limit = rules.allowMultipleAttempts ? rules.maxAttempts : 1;
  return limit === null ? null : Math.max(0, limit - attemptsUsed);
}

/**
 * Prepares an exercise for `profileId`. Course team members and graders get it unchanged; learners get their attempt
 * count and, until the exercise's answer visibility allows it, questions without their answer keys.
 */
export async function prepareExerciseForViewer<E extends ExerciseLike>(
  exercise: E,
  courseId: string,
  profileId: string
) {
  const isStaff = await canAccessCourseSubmissions(courseId, profileId);
  if (isStaff) return { ...exercise, attemptsUsed: 0, attemptsRemaining: null, answersRevealed: true };

  const groupMemberId = await getGroupMemberIdByCourseAndProfile(courseId, profileId);
  const attemptsUsed = groupMemberId ? await countSubmissionAttempts(exercise.id, groupMemberId) : 0;
  const answersRevealed = canRevealAnswers(exercise, attemptsUsed);
  const attemptsRemaining = remainingAttempts(exercise, attemptsUsed);
  if (answersRevealed) return { ...exercise, attemptsUsed, attemptsRemaining, answersRevealed };

  const questions = exercise.questions?.map((question) => redactAnswerKey(question));
  const sections = exercise.sections?.map((section) => ({
    ...section,
    questions: section.questions.map((question) => redactAnswerKey(question))
  }));

  return { ...exercise, questions, sections, attemptsUsed, attemptsRemaining, answersRevealed };
}
