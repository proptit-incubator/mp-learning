import type { TPracticeCall } from '@cio/db/types';
import { getStorageConfig } from '@cio/core/config/storage';
import { generateDownloadPresignedUrls, uploadToS3 } from '@cio/core/utils/s3';

export const PRACTICE_RECORDING_CONTENT_TYPE = 'audio/wav';

/** Uploads a finished call's WAV and returns its storage key, or null when the upload failed. */
export async function storePracticeRecording(call: TPracticeCall, wav: Buffer): Promise<string | null> {
  const { bucketDocuments } = getStorageConfig();
  const key = `practice-calls/${call.organizationId}/${call.id}.wav`;
  const upload = await uploadToS3({
    Bucket: bucketDocuments,
    Key: key,
    Body: wav,
    ContentType: PRACTICE_RECORDING_CONTENT_TYPE
  });

  if (!upload.success) {
    console.error('practice call recording upload failed:', upload.error);

    return null;
  }

  return key;
}

/** A short-lived playback URL for the call's recording, or null when there is none. */
export async function getPracticeRecordingUrl(call: TPracticeCall): Promise<string | null> {
  if (!call.recordingKey) return null;

  try {
    const { bucketDocuments } = getStorageConfig();
    const urls = await generateDownloadPresignedUrls([call.recordingKey], bucketDocuments);

    return urls[call.recordingKey] ?? null;
  } catch (error) {
    console.error('practice call recording url failed:', error);

    return null;
  }
}
