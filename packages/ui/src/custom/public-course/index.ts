export { default as PublicCourseBottomNav } from './bottom-nav.svelte';
export type { CopyPageLabels, StudyChatInput, StudyChatTarget } from './copy-page-utils';
export type { OutlineRailActionLabels, ShareActionLabels } from './share-utils';

export {
  PUBLIC_EXERCISE_ATTEMPTS_STORE_VERSION,
  cloneAnswersByKey,
  publicExerciseAttemptsStorageKey,
  readPublicExerciseAttempts,
  writePublicExerciseAttempts
} from './public-exercise-attempts-storage';
export type { PublicExerciseStoredAttempt } from './public-exercise-attempts-storage';

export type {
  PublicCourseCalloutAnimation,
  PublicCourseCalloutData,
  PublicCourseOrgData,
  PublicCourseSidebarItem,
  PublicCourseSidebarSection,
  PublicCourseItemVariant,
  PublicLessonViewData,
  PublicExerciseViewData,
  PublicItemViewData
} from './types';
