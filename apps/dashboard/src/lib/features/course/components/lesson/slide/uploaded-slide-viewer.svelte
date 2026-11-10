<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { openPdfDocument, type PdfDocument } from '$lib/utils/functions/pdfjs';
  import { SlideEmbedFrame, type UploadedSlide } from '@cio/ui';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import { getOfficeViewerSrc } from '@cio/utils/functions';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
  import MaximizeIcon from '@lucide/svelte/icons/maximize';
  import MinimizeIcon from '@lucide/svelte/icons/minimize';
  import { onDestroy } from 'svelte';

  interface Props {
    slide: UploadedSlide;
    title: string;
  }

  let { slide, title }: Props = $props();

  const prefix = 'course.navItem.lessons.materials.tabs.slide.viewer';

  let container: HTMLDivElement | undefined = $state();
  let canvas: HTMLCanvasElement | undefined = $state();
  let pdfDocument = $state<PdfDocument | null>(null);
  let pageNumber = $state(1);
  let isLoading = $state(true);
  let loadFailed = $state(false);
  let isFullscreen = $state(false);
  let stageWidth = $state(0);
  let stageHeight = $state(0);
  let renderTask: { cancel: () => void } | null = null;
  let latestRenderId = 0;

  const pageCount = $derived(pdfDocument?.numPages ?? 0);

  $effect(() => {
    if (slide.fileType !== 'pdf') return;

    const src = slide.src;
    let cancelled = false;

    isLoading = true;
    loadFailed = false;
    pageNumber = 1;

    openPdfDocument(src)
      .then((openedDocument) => {
        if (cancelled) {
          void openedDocument.destroy();
          return;
        }

        pdfDocument = openedDocument;
      })
      .catch((error) => {
        if (cancelled) return;

        console.error('Error loading slide PDF:', error);
        loadFailed = true;
      })
      .finally(() => {
        if (!cancelled) isLoading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!pdfDocument || !canvas || !stageWidth || !stageHeight) return;

    void renderPage(pdfDocument, canvas, pageNumber, stageWidth, stageHeight);
  });

  async function renderPage(
    documentToRender: PdfDocument,
    targetCanvas: HTMLCanvasElement,
    targetPage: number,
    maxWidth: number,
    maxHeight: number
  ) {
    const renderId = ++latestRenderId;

    renderTask?.cancel();
    renderTask = null;

    const page = await documentToRender.getPage(targetPage);

    if (renderId !== latestRenderId) return;

    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height);
    const pixelRatio = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: fitScale * pixelRatio });
    const context = targetCanvas.getContext('2d');

    if (!context) return;

    targetCanvas.width = Math.floor(viewport.width);
    targetCanvas.height = Math.floor(viewport.height);
    targetCanvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
    targetCanvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

    const task = page.render({ canvasContext: context, viewport });

    renderTask = task;

    try {
      await task.promise;
    } catch {
      return;
    }
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > pageCount) return;

    pageNumber = nextPage;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      goToPage(pageNumber + 1);
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      goToPage(pageNumber - 1);
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void container?.requestFullscreen();
  }

  function handleFullscreenChange() {
    isFullscreen = document.fullscreenElement === container;
  }

  onDestroy(() => {
    renderTask?.cancel();
    void pdfDocument?.destroy();
  });
</script>

<svelte:document onfullscreenchange={handleFullscreenChange} />

{#if slide.fileType === 'pptx'}
  <SlideEmbedFrame src={getOfficeViewerSrc(slide.src)} {title} />
{:else}
  <div
    bind:this={container}
    class="flex w-full flex-col overflow-hidden rounded-md {isFullscreen ? 'h-full bg-black' : 'ui:bg-muted'}"
    role="region"
    aria-label={title}
    tabindex="-1"
    onkeydown={handleKeydown}
  >
    <div
      bind:clientWidth={stageWidth}
      bind:clientHeight={stageHeight}
      class="relative flex w-full items-center justify-center {isFullscreen ? 'min-h-0 flex-1' : 'aspect-video'}"
    >
      {#if isLoading}
        <span class="ui:text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
          {$t(`${prefix}.loading`)}
        </span>
      {:else if loadFailed}
        <span class="ui:text-muted-foreground px-4 text-center text-sm">{$t(`${prefix}.load_error`)}</span>
      {/if}
      <canvas
        bind:this={canvas}
        class="max-h-full max-w-full {isLoading || loadFailed ? 'hidden' : ''}"
        oncontextmenu={(event) => event.preventDefault()}
      ></canvas>
    </div>

    {#if pageCount > 0}
      <div class="ui:bg-background ui:border-border flex items-center justify-between gap-2 border-t px-2 py-1.5">
        <div class="flex items-center gap-1">
          <IconButton
            disabled={pageNumber <= 1}
            onclick={() => goToPage(pageNumber - 1)}
            aria-label={$t(`${prefix}.previous`)}
          >
            <ChevronLeftIcon size={18} />
          </IconButton>
          <span class="ui:text-muted-foreground min-w-14 text-center text-sm tabular-nums">
            {$t(`${prefix}.page`, { current: pageNumber, total: pageCount })}
          </span>
          <IconButton
            disabled={pageNumber >= pageCount}
            onclick={() => goToPage(pageNumber + 1)}
            aria-label={$t(`${prefix}.next`)}
          >
            <ChevronRightIcon size={18} />
          </IconButton>
        </div>
        <IconButton
          onclick={toggleFullscreen}
          aria-label={$t(isFullscreen ? `${prefix}.exit_fullscreen` : `${prefix}.fullscreen`)}
        >
          {#if isFullscreen}
            <MinimizeIcon size={16} />
          {:else}
            <MaximizeIcon size={16} />
          {/if}
        </IconButton>
      </div>
    {/if}
  </div>
{/if}
