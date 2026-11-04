<script lang="ts">
  import { InputField } from '@cio/ui/custom/input-field';
  import { t } from '$lib/utils/functions/translations';
  import { courseApi, exerciseApi } from '$features/course/api';
  import { profile } from '$lib/utils/store/user';
  import { ContentType } from '@cio/utils/constants/content';
  import type { StepperState, StepperActions, BaseStepperProps } from './types';
  import { EXERCISE_STEPPER_DEFAULT_STATE } from './constants';

  interface Props extends BaseStepperProps {
    stepperState: StepperState;
  }

  let {
    courseId,
    sectionId,
    order,
    onCreated,
    canCreate,
    session,
    stepperState = $bindable(EXERCISE_STEPPER_DEFAULT_STATE)
  }: Props = $props();

  let isLoading = $state(false);
  let title = $state('');

  async function handleAddExercise() {
    if (!title.trim() || !canCreate || isLoading) return;

    const startedSession = session;
    isLoading = true;
    try {
      const trimmedTitle = title.trim();
      const createdExercise = await exerciseApi.create(
        courseId,
        {
          title: trimmedTitle,
          sectionId,
          order
        },
        { silent: true }
      );

      if (createdExercise) {
        const profileId = $profile?.id;
        if (profileId) {
          void courseApi.refreshCourse(courseId, profileId).catch((refreshError) => {
            console.error('Failed to refresh course after exercise create:', refreshError);
          });
        }

        onCreated(
          {
            id: createdExercise.id,
            title: createdExercise.title ?? trimmedTitle,
            type: ContentType.Exercise,
            order
          },
          startedSession
        );
      }
    } finally {
      isLoading = false;
    }
  }

  const canProceed = $derived(title.trim().length > 0 && canCreate);
  const primaryActionLabel = $derived($t('course.navItem.lessons.exercises.new_exercise_modal.finish'));

  $effect(() => {
    const next = {
      currentStep: 0,
      totalSteps: 1,
      canProceed,
      isSubmitting: isLoading,
      primaryActionLabel
    };
    if (
      stepperState.canProceed !== next.canProceed ||
      stepperState.isSubmitting !== next.isSubmitting ||
      stepperState.primaryActionLabel !== next.primaryActionLabel ||
      stepperState.totalSteps !== next.totalSteps
    ) {
      stepperState = next;
    }
  });

  export const actions: StepperActions = {
    async next() {
      await handleAddExercise();
    },

    back() {},

    reset() {
      title = '';
      isLoading = false;
      stepperState = { ...EXERCISE_STEPPER_DEFAULT_STATE };
    }
  };
</script>

<div class="w-full">
  <InputField
    label={$t('course.navItem.lessons.exercises.new_exercise_modal.title')}
    bind:value={title}
    autoFocus={true}
    placeholder={$t('course.navItem.lessons.exercises.new_exercise_modal.title_placeholder')}
    className="my-4 w-full"
  />
</div>
