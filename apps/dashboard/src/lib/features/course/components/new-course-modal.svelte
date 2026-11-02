<script lang="ts">
  import { preventDefault } from '$lib/utils/functions/svelte';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { createCourseModal } from '../utils/store';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { InputField } from '@cio/ui/custom/input-field';
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import { courseApi } from '../api';

  function onClose(redirectTo) {
    goto(redirectTo);

    createCourseModal.update(() => ({
      title: '',
      description: '',
      type: '',
      emails: '',
      tutors: '',
      students: ''
    }));
  }

  async function createCourse() {
    await courseApi.create(
      {
        title: $createCourseModal.title,
        description: $createCourseModal.description
      },
      (courseId) => {
        goto(resolve(`/courses/${courseId}/lessons`, {}));
      }
    );
  }

  let open = $derived(new URLSearchParams(page.url.search).get('create') === 'true');
</script>

<Dialog.Root
  bind:open
  onOpenChange={(isOpen) => {
    if (!isOpen) onClose(page.url.pathname);
  }}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{$t('courses.new_course_modal.heading')}</Dialog.Title>
    </Dialog.Header>
    <form onsubmit={preventDefault(createCourse)}>
      <div class="mb-4 flex items-end space-x-2">
        <InputField
          label={$t('courses.new_course_modal.course_name')}
          bind:value={$createCourseModal.title}
          placeholder={$t('courses.new_course_modal.course_name_placeholder')}
          className="w-full"
          isRequired={true}
          errorMessage={courseApi.errors.title}
          onInput={() => courseApi.clearError('title')}
          autoComplete={false}
        />
      </div>

      <TextareaField
        label={$t('courses.new_course_modal.short_description')}
        bind:value={$createCourseModal.description}
        rows={4}
        placeholder={$t('courses.new_course_modal.short_description_placeholder')}
        className="mb-4"
        isRequired={true}
        errorMessage={courseApi.errors.description}
        oninput={() => courseApi.clearError('description')}
        isAIEnabled={true}
        initAIPrompt="Write a 30 word description for a course titled: {$createCourseModal.title}"
      />

      <Dialog.Footer>
        <Button type="submit" disabled={courseApi.isLoading} loading={courseApi.isLoading}>
          {$t('courses.new_course_modal.button')}
        </Button>
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>
