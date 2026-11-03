<script lang="ts">
  import type { Editor } from '@tiptap/core';
  import * as Dialog from '$src/base/dialog';
  import * as UnderlineTabs from '../../../underline-tabs';
  import * as ImageCropper from '../../../image-cropper';
  import { Button } from '$src/base/button';
  import { InputField } from '../../../input-field';
  import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
  import LoaderCircle from '@lucide/svelte/icons/loader-circle';

  interface Props {
    editor?: Editor;
    open?: boolean;
    onImageUpload?: (file: File) => Promise<string>;
    onImageSelect?: (url: string) => void;
    cropAspect?: number;
    /** Crop after upload when an aspect ratio is required. Off by default (editor images have no size rule). */
    enableCrop?: boolean;
  }

  let {
    editor,
    open = $bindable(false),
    onImageUpload,
    onImageSelect,
    cropAspect,
    enableCrop = !!cropAspect
  }: Props = $props();

  const tabs = $derived([
    ...(onImageUpload ? [{ label: 'Upload', value: 'upload' }] : []),
    { label: 'Link', value: 'link' }
  ]);

  let currentTab = $state(tabs[0].value);
  let cropperSrc = $state('');
  let isUploading = $state(false);

  let imageUrl = $state('');

  function handleImageSelect(src: string) {
    if (!src) return;
    if (onImageSelect) {
      onImageSelect(src);
    } else if (editor && !editor.isDestroyed) {
      editor.chain().focus().setImage({ src }).run();
    }
    open = false;
  }

  async function uploadSelectedFile(file: File) {
    if (!onImageUpload) return;
    try {
      isUploading = true;
      const url = await onImageUpload(file);
      if (url) handleImageSelect(url);
    } catch (error) {
      console.error('Image upload failed:', error);
      window.alert('Failed to upload image');
    } finally {
      isUploading = false;
    }
  }

  async function handleCropped(croppedUrl: string) {
    const file = await ImageCropper.getFileFromUrl(croppedUrl);
    await uploadSelectedFile(file);
  }

  function handleUnsupportedFile(file: File) {
    window.alert(`Unsupported image: ${file.type}`);
  }

  function handleUrlInsert() {
    if (imageUrl.trim()) handleImageSelect(imageUrl.trim());
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="ui:z-[300]! ui:w-[95%] ui:max-w-2xl!">
    <Dialog.Header>
      <Dialog.Title>Insert image</Dialog.Title>
    </Dialog.Header>
    <div class="ui:w-full ui:p-2">
      <UnderlineTabs.Root bind:value={currentTab}>
        <UnderlineTabs.List>
          {#each tabs as tab}
            <UnderlineTabs.Trigger value={tab.value}>
              {tab.label}
            </UnderlineTabs.Trigger>
          {/each}
        </UnderlineTabs.List>

        {#if onImageUpload}
          <UnderlineTabs.Content value="upload">
            <div class="ui:w-full">
              <ImageCropper.Root
                bind:src={cropperSrc}
                onCropped={handleCropped}
                onFileSelected={enableCrop ? undefined : uploadSelectedFile}
                onUnsupportedFile={handleUnsupportedFile}
                accept=".jpg, .jpeg, .png, .webp"
                disabled={isUploading}
                skipCrop={!enableCrop}
              >
                <ImageCropper.UploadTrigger
                  class="ui:flex ui:w-full ui:cursor-pointer ui:flex-col ui:items-center ui:justify-center ui:gap-2 ui:rounded-lg ui:border-2 ui:border-dashed ui:border-input ui:bg-muted/30 ui:px-6 ui:py-10 ui:text-center ui:transition-colors ui:hover:bg-muted/60"
                >
                  {#if isUploading}
                    <LoaderCircle class="ui:text-muted-foreground ui:size-6 ui:animate-spin" />
                    <p class="ui:m-0 ui:text-sm ui:font-medium">Uploading…</p>
                  {:else}
                    <UploadCloudIcon class="ui:text-muted-foreground" size={28} />
                    <p class="ui:m-0 ui:text-sm ui:font-medium">Drag and drop an image here, or click to select</p>
                    <p class="ui:m-0 ui:text-xs ui:text-muted-foreground">Accepted: jpeg, jpg, png, webp</p>
                  {/if}
                </ImageCropper.UploadTrigger>

                {#if enableCrop}
                  <ImageCropper.Dialog class="ui:z-[350]!">
                    <ImageCropper.Cropper cropShape="rect" {...cropAspect ? { aspect: cropAspect } : {}} />
                    <ImageCropper.Controls>
                      <ImageCropper.Cancel />
                      <ImageCropper.Crop />
                    </ImageCropper.Controls>
                  </ImageCropper.Dialog>
                {/if}
              </ImageCropper.Root>
            </div>
          </UnderlineTabs.Content>
        {/if}

        <UnderlineTabs.Content value="link">
          <div class="ui:flex ui:flex-col ui:gap-3 ui:p-1">
            <InputField bind:value={imageUrl} placeholder="https://example.com/image.png" />
            <Button type="button" onclick={handleUrlInsert} class="ui:self-start">Insert</Button>
          </div>
        </UnderlineTabs.Content>
      </UnderlineTabs.Root>
    </div>
  </Dialog.Content>
</Dialog.Root>
