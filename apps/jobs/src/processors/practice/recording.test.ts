import { beforeEach, describe, expect, it, vi } from 'vitest';

const listPracticeRecordingsEndedBefore = vi.fn();
const replacePracticeRecording = vi.fn();
const getAiPolicy = vi.fn();
const send = vi.fn();

vi.mock('@cio/db/queries/practice', () => ({
  getPracticeCall: vi.fn(),
  listPracticeRecordingsEndedBefore,
  replacePracticeRecording
}));
vi.mock('@cio/core/services/agent/usage', () => ({ getAiPolicy }));
vi.mock('../../config/storage', () => ({
  getS3Client: () => ({ send }),
  getStorageConfig: () => ({ bucketDocuments: 'documents' })
}));

const { runPracticeRecordingRetention } = await import('./recording');

const NOW = new Date('2026-12-01T00:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe('runPracticeRecordingRetention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    replacePracticeRecording.mockResolvedValue(true);
  });

  it("deletes only recordings older than their organization's retention", async () => {
    listPracticeRecordingsEndedBefore.mockResolvedValue([
      { id: 'old', organizationId: 'org-a', recordingKey: 'a/old.webm', endedAt: daysAgo(22) },
      { id: 'recent', organizationId: 'org-a', recordingKey: 'a/recent.webm', endedAt: daysAgo(10) },
      { id: 'short-retention', organizationId: 'org-b', recordingKey: 'b/call.webm', endedAt: daysAgo(10) }
    ]);
    getAiPolicy.mockImplementation(async (orgId: string) => ({ voiceCallRecordingDays: orgId === 'org-a' ? 21 : 7 }));

    const result = await runPracticeRecordingRetention(NOW);

    expect(result).toEqual({ scanned: 3, deleted: 2 });
    expect(listPracticeRecordingsEndedBefore).toHaveBeenCalledWith(daysAgo(7), expect.any(Number));
    expect(send).toHaveBeenCalledTimes(2);
    expect(replacePracticeRecording.mock.calls.map(([callId]) => callId)).toEqual(['old', 'short-retention']);
    expect(replacePracticeRecording).toHaveBeenCalledWith('old', 'a/old.webm', {
      recordingKey: null,
      recordingContentType: null,
      recordingDeletedAt: NOW.toISOString()
    });
    expect(getAiPolicy).toHaveBeenCalledTimes(2);
  });
});
