<script lang="ts">
  import EyeIcon from '@lucide/svelte/icons/eye';
  import { Button } from '@cio/ui/base/button';
  import * as Dialog from '@cio/ui/base/dialog';
  import { t } from '$lib/utils/functions/translations';
  import { copyCourseShareUrl, viewAsStudent } from '$features/course/utils/course-preview';

  interface Props {
    open?: boolean;
    courseId?: string | null;
    currentOrgDomain?: string;
  }

  let { open = $bindable(false), courseId = null, currentOrgDomain = '' }: Props = $props();

  let isNavigating = $state(false);

  async function handleCopyLink() {
    if (!courseId) return;

    await copyCourseShareUrl(courseId);
  }

  async function handleGoToLms() {
    isNavigating = true;

    // Opens the student view in a new tab; close the modal once the handoff starts.
    const ok = await viewAsStudent({ courseId, currentOrgDomain });
    isNavigating = false;

    if (ok) {
      open = false;
    }
  }
</script>

<Dialog.Root
  bind:open
  onOpenChange={(isOpen) => {
    if (!isOpen && !isNavigating) open = false;
  }}
>
  <Dialog.Content class="w-[calc(100%-2rem)] max-w-xl! p-4">
    <Dialog.Header>
      <Dialog.Title>{$t('course.view_as_student.title')}</Dialog.Title>
      <Dialog.Description>{$t('course.view_as_student.description')}</Dialog.Description>
    </Dialog.Header>

    <div class="ui:bg-facet relative my-4 grid aspect-[16/7] place-items-center overflow-hidden rounded-lg">
      <span
        class="grid size-14 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur"
      >
        <EyeIcon class="custom size-6" />
      </span>
    </div>

    <Dialog.Footer>
      <Button variant="secondary" onclick={handleCopyLink} disabled={!courseId || isNavigating}>
        {$t('course.view_as_student.copy_link')}
      </Button>
      <Button variant="default" onclick={handleGoToLms} disabled={!courseId} loading={isNavigating}>
        {$t('course.view_as_student.go_to_lms')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
