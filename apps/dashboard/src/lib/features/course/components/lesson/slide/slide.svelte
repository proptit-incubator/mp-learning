<script lang="ts">
  import { lessonApi } from '$features/course/api';
  import { DeleteModal } from '$features/ui';
  import { Button } from '@cio/ui/base/button';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Item from '@cio/ui/base/item';
  import { Empty } from '@cio/ui/custom/empty';
  import {
    SlideEmbedCard,
    SlideEmbedFrame,
    SlideEmbedPicker,
    type LessonSlide,
    type SlideEmbedPickerLabels,
    type SlidePlatformId
  } from '@cio/ui';
  import { isUploadedSlide, resolveLessonSlides, SLIDE_PLATFORM_BY_ID, SLIDE_PLATFORM_IDS } from '@cio/utils/functions';
  import { t } from '$lib/utils/functions/translations';
  import MODES from '$lib/utils/constants/mode';
  import PresentationIcon from '@lucide/svelte/icons/presentation';
  import { SlideUploader } from './slide-uploader.svelte';
  import UploadSlide from './upload-slide.svelte';
  import UploadedSlideViewer from './uploaded-slide-viewer.svelte';

  interface Props {
    mode?: (typeof MODES)[keyof typeof MODES];
  }

  let { mode = MODES.view }: Props = $props();

  let pickerOpen = $state(false);
  let pickerCanAdd = $state(false);
  let uploadSelected = $state(true);
  let isAddingUpload = $state(false);
  let slidePicker = $state<{ submit: () => void } | null>(null);
  let openDeleteSlideModal = $state(false);
  let slideIndexToDelete = $state<number | null>(null);

  const slideUploader = new SlideUploader();

  const canAddSlide = $derived(uploadSelected ? slideUploader.isReady && !isAddingUpload : pickerCanAdd);

  const slides = $derived(resolveLessonSlides(lessonApi.lesson?.slides, lessonApi.lesson?.slideUrl));

  const pickerLabels = $derived.by((): SlideEmbedPickerLabels => {
    const prefix = 'course.navItem.lessons.materials.tabs.slide';

    return {
      searchPlaceholder: t.get(`${prefix}.add_slide.search`),
      emptyPrompt: t.get(`${prefix}.add_slide.empty_prompt`),
      embedCodeLabel: t.get(`${prefix}.add_slide.embed_code`),
      embedCodePlaceholder: t.get(`${prefix}.add_slide.embed_placeholder`),
      addEmbed: t.get(`${prefix}.button`),
      howToEmbed: t.get(`${prefix}.add_slide.how_to_embed`),
      previewLabel: t.get(`${prefix}.add_slide.preview`),
      embedReady: t.get(`${prefix}.add_slide.embed_ready`),
      invalidEmbed: t.get(`${prefix}.add_slide.invalid_embed`),
      unsupportedPlatform: t.get(`${prefix}.add_slide.unsupported`),
      platforms: Object.fromEntries(
        SLIDE_PLATFORM_IDS.map((platformId: SlidePlatformId) => [
          platformId,
          {
            hint: t.get(`${prefix}.platforms.${platformId}.hint`),
            steps: [
              t.get(`${prefix}.platforms.${platformId}.step_1`),
              t.get(`${prefix}.platforms.${platformId}.step_2`),
              t.get(`${prefix}.platforms.${platformId}.step_3`)
            ]
          }
        ])
      ) as SlideEmbedPickerLabels['platforms']
    };
  });

  const cardLabels = $derived({
    remove: t.get('course.navItem.lessons.materials.tabs.slide.remove_slide'),
    menuAria: t.get('course.navItem.lessons.materials.tabs.slide.menu_aria')
  });

  function getSlideFrameTitle(slide: LessonSlide, index: number) {
    const platformName = isUploadedSlide(slide)
      ? slide.name
      : (SLIDE_PLATFORM_BY_ID[slide.platform]?.name ?? slide.platform);

    return t.get('course.navItem.lessons.materials.tabs.slide.frame_title', {
      platform: platformName,
      index: index + 1,
      total: slides.length
    });
  }

  function handleAdd(slide: LessonSlide) {
    lessonApi.setLessonSlides([...slides, slide]);
    closePicker();
  }

  async function addUploadedSlide() {
    isAddingUpload = true;

    const slide = await slideUploader.finalize(lessonApi.lesson?.id, slides.length);

    isAddingUpload = false;

    if (slide) handleAdd(slide);
  }

  function submitPicker() {
    if (uploadSelected) {
      void addUploadedSlide();
      return;
    }

    slidePicker?.submit();
  }

  function closePicker() {
    pickerOpen = false;
    uploadSelected = true;
  }

  function handlePickerOpenChange(isOpen: boolean) {
    if (isOpen) {
      pickerOpen = true;
      return;
    }

    if (slideUploader.isUploading || isAddingUpload) return;

    slideUploader.reset();
    closePicker();
  }

  function requestRemoveSlide(index: number) {
    slideIndexToDelete = index;
    openDeleteSlideModal = true;
  }

  function confirmRemoveSlide() {
    if (slideIndexToDelete === null) {
      openDeleteSlideModal = false;
      return;
    }

    void lessonApi.removeLessonSlide(slides, slideIndexToDelete);
    slideIndexToDelete = null;
    openDeleteSlideModal = false;
  }
</script>

{#if mode === MODES.edit}
  <Button onclick={() => (pickerOpen = true)} class="float-end my-4">
    {$t('course.navItem.lessons.materials.tabs.slide.button')}
  </Button>

  {#if slides.length}
    <Item.Group class="grid! w-full grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-x-5 gap-y-8">
      {#each slides as slide, index (slide.id)}
        <SlideEmbedCard {slide} labels={cardLabels} isEditMode={true} onRemove={() => requestRemoveSlide(index)} />
      {/each}
    </Item.Group>
  {:else}
    <Empty
      title={$t('course.navItem.lessons.materials.tabs.slide.empty_title')}
      description={$t('course.navItem.lessons.materials.tabs.slide.empty_description')}
      icon={PresentationIcon}
    />
  {/if}

  <Dialog.Root open={pickerOpen} onOpenChange={handlePickerOpenChange}>
    <Dialog.Content class="ui:flex flex h-[min(720px,90dvh)] min-h-0 max-w-4xl! flex-col overflow-hidden">
      <Dialog.Header class="shrink-0">
        <Dialog.Title>{$t('course.navItem.lessons.materials.tabs.slide.add_slide.title')}</Dialog.Title>
      </Dialog.Header>
      {#if pickerOpen}
        <SlideEmbedPicker
          bind:this={slidePicker}
          bind:canAdd={pickerCanAdd}
          bind:uploadSelected
          uploadLabel={$t('course.navItem.lessons.materials.tabs.slide.upload.label')}
          hideAddButton
          class="ui:min-h-0 ui:flex-1 ui:overflow-hidden"
          labels={pickerLabels}
          onAdd={handleAdd}
        >
          {#snippet upload()}
            <UploadSlide uploader={slideUploader} />
          {/snippet}
        </SlideEmbedPicker>
      {/if}
      <Dialog.Footer sticky class="shrink-0">
        <Button size="sm" disabled={!canAddSlide} loading={isAddingUpload} onclick={submitPicker}>
          {$t('course.navItem.lessons.materials.tabs.slide.button')}
        </Button>
      </Dialog.Footer>
    </Dialog.Content>
  </Dialog.Root>

  <DeleteModal bind:open={openDeleteSlideModal} onDelete={confirmRemoveSlide} />
{:else if slides.length}
  <div class="w-full">
    {#each slides as slide, index (slide.id)}
      <div class="{index < slides.length - 1 ? 'mb-5' : ''} w-full overflow-hidden">
        {#if isUploadedSlide(slide)}
          <UploadedSlideViewer {slide} title={getSlideFrameTitle(slide, index)} />
        {:else}
          <SlideEmbedFrame src={slide.src} title={getSlideFrameTitle(slide, index)} />
        {/if}
      </div>
    {/each}
  </div>
{/if}
