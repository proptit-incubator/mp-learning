import { mediaApi } from '$features/media/api';
import { lessonDocUpload } from '$features/course/components/lesson/store';
import { DocumentUploader } from '$lib/utils/services/courses/presign';
import {
  getUploadedSlideFileType,
  UPLOADED_SLIDE_MIME_TYPES,
  UPLOADED_SLIDE_PLATFORM,
  type UploadedSlide
} from '@cio/utils/functions';
import { get } from 'svelte/store';

/**
 * Uploads one PDF or PPTX slide file to document storage and turns it into a lesson slide.
 */
export class SlideUploader {
  file = $state<File | null>(null);
  uploadedSlide = $state<UploadedSlide | null>(null);
  isUploading = $state(false);
  failed = $state(false);

  private documentUploader = new DocumentUploader();

  get isReady() {
    return this.uploadedSlide !== null && !this.isUploading;
  }

  async upload(file: File) {
    const fileType = getUploadedSlideFileType(file);

    if (!fileType) return;

    this.reset();
    this.file = file;
    this.isUploading = true;
    this.documentUploader.initUpload();

    try {
      const { url: uploadUrl, fileKey } = await this.documentUploader.getPresignedUrl(file);

      await this.documentUploader.uploadFile({ url: uploadUrl, file });

      const { urls } = await this.documentUploader.getDownloadPresignedUrl([fileKey]);
      const downloadUrl = urls[fileKey];

      if (!downloadUrl) throw new Error('Missing download URL for uploaded slide');

      this.uploadedSlide = {
        id: crypto.randomUUID(),
        src: downloadUrl,
        platform: UPLOADED_SLIDE_PLATFORM,
        key: fileKey,
        name: file.name,
        size: file.size,
        fileType
      };
    } catch (error) {
      if (!get(lessonDocUpload).isCancelled) {
        console.error('Slide upload error:', error);
        this.failed = true;
      }

      this.file = null;
    } finally {
      this.isUploading = false;
      lessonDocUpload.update((state) => ({ ...state, isUploading: false }));
    }
  }

  /**
   * Registers the uploaded file as an organization asset attached to the lesson and returns the slide to persist.
   */
  async finalize(lessonId: string | undefined, position: number): Promise<UploadedSlide | null> {
    const slide = this.uploadedSlide;

    if (!slide) return null;

    const asset = await mediaApi.registerUploadedDocument({
      lessonId,
      position,
      slotType: 'lesson_slide',
      fileKey: slide.key,
      documentUrl: slide.src,
      fileName: slide.name,
      mimeType: UPLOADED_SLIDE_MIME_TYPES[slide.fileType],
      byteSize: slide.size
    });
    const assetId = asset?.id;

    this.reset();

    return assetId ? { ...slide, assetId } : slide;
  }

  cancel() {
    this.documentUploader.cancelUpload();
    this.reset();
  }

  reset() {
    this.file = null;
    this.uploadedSlide = null;
    this.failed = false;
    lessonDocUpload.update((state) => ({ ...state, uploadProgress: 0, isCancelled: false, error: null }));
  }
}
