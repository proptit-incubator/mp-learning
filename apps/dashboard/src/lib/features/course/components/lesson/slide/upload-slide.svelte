<script lang="ts">
  import { lessonDocUpload } from '$features/course/components/lesson/store';
  import { CloseButton, UpgradeBanner } from '$features/ui';
  import { t } from '$lib/utils/functions/translations';
  import { getResolvedUploadLimits } from '$lib/utils/config/upload-limits-context';
  import { isFreePlan } from '$lib/utils/store/org';
  import { Button } from '@cio/ui/base/button';
  import * as FileDropZone from '@cio/ui/custom/file-drop-zone';
  import type { FileRejectedReason } from '@cio/ui/custom/file-drop-zone';
  import { getUploadedSlideFileType, UPLOADED_SLIDE_MIME_TYPES } from '@cio/utils/functions';
  import CheckIcon from '@lucide/svelte/icons/check';
  import FileTextIcon from '@lucide/svelte/icons/file-text';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { snackbar } from '$features/ui/snackbar/store';
  import type { SlideUploader } from './slide-uploader.svelte';

  interface Props {
    uploader: SlideUploader;
  }

  let { uploader }: Props = $props();

  const prefix = 'course.navItem.lessons.materials.tabs.slide.upload';
  const maxSlideSize = getResolvedUploadLimits().documentBytes;
  const accept = `.pdf,.pptx,${Object.values(UPLOADED_SLIDE_MIME_TYPES).join(',')}`;
  const steps = [`${prefix}.step_1`, `${prefix}.step_2`, `${prefix}.step_3`];

  function formatFileSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  async function handleFiles(files: File[]) {
    const file = files[0];

    if (!file) return;

    if (!getUploadedSlideFileType(file)) {
      snackbar.error(`${prefix}.file_type_error`);
      return;
    }

    if (file.size > maxSlideSize) {
      snackbar.error($t(`${prefix}.file_size_error`, { size: formatFileSize(maxSlideSize) }));
      return;
    }

    await uploader.upload(file);

    if (uploader.failed) {
      snackbar.error(`${prefix}.upload_error`);
    }
  }

  function handleFileRejected(opts: { reason: FileRejectedReason; file: File }) {
    if (opts.reason === 'Maximum file size exceeded') {
      snackbar.error($t(`${prefix}.file_size_error`, { size: formatFileSize(maxSlideSize) }));
      return;
    }

    snackbar.error(`${prefix}.file_type_error`);
  }
</script>

<div class="flex items-center gap-3">
  <span
    class="ui:bg-primary/10 ui:text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-md"
    aria-hidden="true"
  >
    <UploadIcon class="custom ui:text-primary size-5" />
  </span>
  <div>
    <p class="text-base font-semibold">{$t(`${prefix}.title`)}</p>
    <p class="ui:text-muted-foreground text-xs">{$t(`${prefix}.hint`)}</p>
  </div>
</div>

<ol class="m-0 flex list-none flex-col gap-2 p-0">
  {#each steps as step, stepIndex (step)}
    <li class="flex gap-2.5 text-sm">
      <span
        class="ui:bg-foreground ui:text-background mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
      >
        {stepIndex + 1}
      </span>
      <span class="ui:text-muted-foreground">{$t(step)}</span>
    </li>
  {/each}
</ol>

<UpgradeBanner className="mb-1">{$t(`${prefix}.upgrade`)}</UpgradeBanner>

{#if uploader.file}
  <div class="ui:border-border flex flex-col gap-3 rounded-lg border p-4">
    <div class="flex items-center gap-3">
      <FileTextIcon class="ui:text-muted-foreground size-5 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="ui:text-foreground truncate text-sm font-medium">{uploader.file.name}</p>
        <p class="ui:text-muted-foreground text-xs">{formatFileSize(uploader.file.size)}</p>
      </div>
      {#if !uploader.isUploading}
        <CloseButton onClick={() => uploader.reset()} />
      {/if}
    </div>

    {#if uploader.isUploading}
      <div>
        <div class="ui:text-muted-foreground mb-1 flex justify-between text-xs">
          <span>{$t(`${prefix}.uploading`)}</span>
          <span>{$lessonDocUpload.uploadProgress}%</span>
        </div>
        <div class="ui:bg-muted h-2 w-full rounded-full">
          <div
            class="ui:bg-primary h-2 rounded-full transition-all duration-300"
            style="width: {$lessonDocUpload.uploadProgress}%"
          ></div>
        </div>
        <div class="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onclick={() => uploader.cancel()}>
            {$t(`${prefix}.cancel`)}
          </Button>
        </div>
      </div>
    {:else if uploader.isReady}
      <p class="flex items-center gap-1.5 text-xs font-semibold text-green-600">
        <CheckIcon class="size-3.5" aria-hidden="true" />
        {$t(`${prefix}.ready`)}
      </p>
    {/if}
  </div>
{:else}
  <div class={$isFreePlan ? 'pointer-events-none opacity-50' : ''}>
    <FileDropZone.Root
      {accept}
      maxFiles={1}
      fileCount={0}
      maxFileSize={maxSlideSize}
      onUpload={handleFiles}
      onFileRejected={handleFileRejected}
    >
      <FileDropZone.Trigger
        label={$t(`${prefix}.drag_drop`)}
        formatMaxFiles={() => ''}
        formatMaxFilesAndSize={(size) => $t(`${prefix}.up_to_size`, { size })}
        formatMaxSize={(size) => $t(`${prefix}.up_to_size`, { size })}
      />
    </FileDropZone.Root>
  </div>
{/if}

{#if uploader.uploadedSlide?.fileType === 'pptx' || uploader.file?.name.toLowerCase().endsWith('.pptx')}
  <p class="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
    <TriangleAlertIcon class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
    <span>{$t(`${prefix}.pptx_notice`)}</span>
  </p>
{/if}
