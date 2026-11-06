import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getAiPolicy } from '@cio/core/services/agent/usage';
import { getPracticeCall, listPracticeRecordingsEndedBefore, replacePracticeRecording } from '@cio/db/queries/practice';
import { ZCompressPracticeRecordingPayload } from '@cio/jobs';
import { PRACTICE_RECORDING_MIN_DAYS } from '@cio/utils/validation/agent';

import { getS3Client, getStorageConfig } from '../../config/storage';
import { ffmpegRun } from '../../utils/ffmpeg';
import { log } from '../../utils/logger';
import { downloadObjectToTempFile, safeUnlink, uploadFileToBucket } from '../../utils/storage';

const DAY_MS = 86_400_000;
const RETENTION_BATCH = 2_000;
const COMPRESSED_CONTENT_TYPE = 'audio/webm';
const OPUS_ARGS = ['-c:a', 'libopus', '-b:a', '16k', '-application', 'voip', '-f', 'webm'];

async function deleteObject(bucket: string, key: string) {
  await getS3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

function compressedKeyFor(sourceKey: string): string {
  return `${sourceKey.replace(/\.wav$/, '')}.webm`;
}

/** Replaces a call's WAV recording with an Opus file about eight times smaller. Leaves the WAV if anything fails. */
export async function processCompressPracticeRecording(data: unknown) {
  const { callId, sourceKey } = ZCompressPracticeRecordingPayload.parse(data);
  const call = await getPracticeCall(callId);
  if (call?.recordingKey !== sourceKey) return { callId, skipped: true };

  const { bucketDocuments } = getStorageConfig();
  const targetKey = compressedKeyFor(sourceKey);
  const inputPath = await downloadObjectToTempFile(bucketDocuments, sourceKey, 'practice-recording.wav');
  const outputPath = `${inputPath}.webm`;

  try {
    await ffmpegRun(['-y', '-i', inputPath, ...OPUS_ARGS, outputPath]);
    await uploadFileToBucket(bucketDocuments, targetKey, outputPath, COMPRESSED_CONTENT_TYPE);

    const swapped = await replacePracticeRecording(callId, sourceKey, {
      recordingKey: targetKey,
      recordingContentType: COMPRESSED_CONTENT_TYPE
    });
    await deleteObject(bucketDocuments, swapped ? sourceKey : targetKey);

    log.info('practice-recording-compressed', { callId, swapped });

    return { callId, compressed: swapped };
  } finally {
    await safeUnlink(inputPath);
    await safeUnlink(outputPath);
  }
}

/** Deletes recordings older than each organization's retention window; transcripts and scores stay. */
export async function runPracticeRecordingRetention(now = new Date()) {
  const earliestCutoff = new Date(now.getTime() - PRACTICE_RECORDING_MIN_DAYS * DAY_MS).toISOString();
  const candidates = await listPracticeRecordingsEndedBefore(earliestCutoff, RETENTION_BATCH);
  const retentionDaysByOrg = new Map<string, number>();
  const { bucketDocuments } = getStorageConfig();
  const deletedAt = now.toISOString();
  let deleted = 0;

  for (const candidate of candidates) {
    if (!candidate.recordingKey || !candidate.endedAt) continue;

    let retentionDays = retentionDaysByOrg.get(candidate.organizationId);
    if (retentionDays === undefined) {
      retentionDays = (await getAiPolicy(candidate.organizationId)).voiceCallRecordingDays;
      retentionDaysByOrg.set(candidate.organizationId, retentionDays);
    }

    const expiresAt = Date.parse(candidate.endedAt) + retentionDays * DAY_MS;
    if (expiresAt > now.getTime()) continue;

    await deleteObject(bucketDocuments, candidate.recordingKey);
    const cleared = await replacePracticeRecording(candidate.id, candidate.recordingKey, {
      recordingKey: null,
      recordingContentType: null,
      recordingDeletedAt: deletedAt
    });
    if (cleared) deleted += 1;
  }

  return { scanned: candidates.length, deleted };
}
