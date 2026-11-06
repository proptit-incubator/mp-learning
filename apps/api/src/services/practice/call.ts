import {
  createPracticeCall,
  getPracticeCall,
  getPracticeLearner,
  getPracticeReviewerName,
  getPracticeScenario,
  getPracticeScenarioById,
  listPracticeCallsForOrganization,
  listPracticeCallsForProfile,
  updatePracticeCall
} from '@cio/db/queries/practice';
import type { TPracticeCall, TPracticeScenario } from '@cio/db/types';
import type { TPracticeCallReview, TPracticeFeedback } from '@cio/utils/validation/practice';
import { ROLE } from '@cio/utils/constants';
import { env } from '@cio/core/config/env';

import { AppError, ErrorCodes } from '@api/utils/errors';
import type { VoiceCallModelId } from '@cio/utils/agent-models';
import { enqueueCompressPracticeRecording } from '@cio/jobs';
import { getPracticeAiSettings } from './ai-settings';
import { evaluatePracticeCall, isPracticeModelConfigured } from './customer-agent';
import {
  getActivePracticeSession,
  isSpeechToTextConfigured,
  isTextToSpeechConfigured,
  MAX_CALL_DURATION_MS,
  takeCallRecording
} from './call-session';
import { getPracticeRecordingUrl, PRACTICE_RECORDING_CONTENT_TYPE, storePracticeRecording } from './recording';
import { TTS_VOICES } from './voice/tts-stream';
import { withPlaybackOffsets } from './transcript-playback';

const HISTORY_LIMIT = 30;
const DAY_MS = 86_400_000;
const RESULTS_LIMIT = 200;

export interface PracticeViewer {
  userId: string;
  orgRoles: Record<string, number>;
}

function isTeamMember(orgRoles: Record<string, number>, orgId: string): boolean {
  const role = orgRoles[orgId];

  return role === ROLE.ADMIN || role === ROLE.TUTOR;
}

function toLearnerScenario(scenario: TPracticeScenario) {
  return {
    id: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    topic: scenario.topic,
    difficulty: scenario.difficulty,
    customerName: scenario.customerName,
    persona: scenario.persona,
    objective: scenario.objective,
    tip: scenario.tip
  };
}

async function toCallReview(call: TPracticeCall) {
  if (!call.reviewedAt) return null;

  const reviewerName = call.reviewedBy ? await getPracticeReviewerName(call.reviewedBy) : null;

  return {
    score: call.reviewScore,
    comment: call.reviewComment,
    reviewerName,
    reviewedAt: call.reviewedAt
  };
}

async function recordingExpiry(call: TPracticeCall): Promise<string | null> {
  if (!call.recordingKey || !call.endedAt) return null;

  const { recordingDays } = await getPracticeAiSettings(call.organizationId);

  return new Date(Date.parse(call.endedAt) + recordingDays * DAY_MS).toISOString();
}

async function toCallDetail(call: TPracticeCall, scenario: TPracticeScenario) {
  const learnerScenario = toLearnerScenario(scenario);
  const recordingUrl = await getPracticeRecordingUrl(call);
  const recordingExpiresAt = await recordingExpiry(call);
  const review = await toCallReview(call);
  const learner = await getPracticeLearner(call.profileId);
  const transcript = withPlaybackOffsets(call.transcript, call.startedAt, call.durationSeconds);

  return {
    id: call.id,
    profileId: call.profileId,
    learner,
    status: call.status,
    transcript,
    score: call.score,
    feedback: call.feedback,
    startedAt: call.startedAt,
    endedAt: call.endedAt,
    durationSeconds: call.durationSeconds,
    recordingUrl,
    recordingContentType: call.recordingContentType,
    recordingExpiresAt,
    recordingDeletedAt: call.recordingDeletedAt,
    review,
    scenario: learnerScenario
  };
}

function assertPracticeModelConfigured(modelId: VoiceCallModelId) {
  if (!isPracticeModelConfigured(modelId)) {
    throw new AppError('AI is not configured for practice calls', ErrorCodes.PRACTICE_AI_NOT_CONFIGURED, 503);
  }
}

async function loadCallWithScenario(callId: string) {
  const call = await getPracticeCall(callId);
  if (!call) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  const scenario = await getPracticeScenarioById(call.scenarioId);
  if (!scenario) {
    throw new AppError('Practice scenario not found', ErrorCodes.PRACTICE_SCENARIO_NOT_FOUND, 404);
  }

  return { call, scenario };
}

export async function getPracticeCapabilities(orgId: string) {
  const settings = await getPracticeAiSettings(orgId);
  const aiAvailable = isPracticeModelConfigured(settings.voiceCallModel);

  return {
    aiAvailable,
    speechToTextAvailable: isSpeechToTextConfigured(),
    textToSpeechAvailable: isTextToSpeechConfigured(),
    voices: [...TTS_VOICES],
    defaultVoice: settings.defaultVoice,
    maxDurationSeconds: MAX_CALL_DURATION_MS / 1000
  };
}

export async function startPracticeCall(orgId: string, viewer: PracticeViewer, scenarioId: string) {
  const settings = await getPracticeAiSettings(orgId);
  assertPracticeModelConfigured(settings.voiceCallModel);

  const scenario = await getPracticeScenario(orgId, scenarioId);
  const canUseDraft = isTeamMember(viewer.orgRoles, orgId);

  if (!scenario || (!scenario.isPublished && !canUseDraft)) {
    throw new AppError('Practice scenario not found', ErrorCodes.PRACTICE_SCENARIO_NOT_FOUND, 404);
  }

  const call = await createPracticeCall({ organizationId: orgId, scenarioId, profileId: viewer.userId });

  return toCallDetail(call, scenario);
}

export async function getPracticeCallDetail(callId: string, viewer: PracticeViewer) {
  const { call, scenario } = await loadCallWithScenario(callId);
  assertCallVisible(call, viewer);

  return toCallDetail(call, scenario);
}

/** The call and scenario a learner may stream audio into; throws unless the call is theirs and still running. */
export async function openPracticeCallStream(callId: string, userId: string) {
  const { call, scenario } = await loadCallWithScenario(callId);
  const settings = await getPracticeAiSettings(call.organizationId);
  assertPracticeModelConfigured(settings.voiceCallModel);

  if (call.profileId !== userId) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  if (call.status !== 'ACTIVE') {
    throw new AppError('Practice call already ended', ErrorCodes.PRACTICE_CALL_ENDED, 409);
  }

  const voiceId = scenario.voiceId || settings.defaultVoice;

  return { call, scenario, voice: { model: settings.voiceCallModel, voiceId } };
}

async function gradeTranscript(scenario: TPracticeScenario, call: TPracticeCall): Promise<TPracticeFeedback | null> {
  const agentSpoke = call.transcript.some((turn) => turn.speaker === 'agent');
  if (!agentSpoke) return null;

  try {
    const { voiceCallModel } = await getPracticeAiSettings(call.organizationId);

    return await evaluatePracticeCall(scenario, call.transcript, voiceCallModel);
  } catch (error) {
    console.error('practice call evaluation failed:', error);

    return null;
  }
}

async function saveRecording(call: TPracticeCall, durationSeconds: number): Promise<string | null> {
  const recording = takeCallRecording(call.id);
  if (!recording) return null;

  const wav = recording.toWav(durationSeconds);

  return storePracticeRecording(call, wav);
}

/** Hangs up the call, saves the final transcript and grades it. Ending an ended call returns it unchanged. */
export async function endPracticeCall(callId: string, userId: string) {
  const { call, scenario } = await loadCallWithScenario(callId);

  if (call.profileId !== userId) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  if (call.status === 'ENDED') return toCallDetail(call, scenario);

  const liveSession = getActivePracticeSession(callId);
  const transcript = liveSession ? await liveSession.finish() : call.transcript;

  const endedAt = new Date();
  const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - Date.parse(call.startedAt)) / 1000));
  const finishedCall = { ...call, transcript };
  const recordingKey = await saveRecording(call, durationSeconds);
  const feedback = await gradeTranscript(scenario, finishedCall);
  const score = feedback?.score ?? null;
  const recordingFields = recordingKey ? { recordingKey, recordingContentType: PRACTICE_RECORDING_CONTENT_TYPE } : {};

  const updated = await updatePracticeCall(callId, {
    status: 'ENDED',
    transcript,
    endedAt: endedAt.toISOString(),
    durationSeconds,
    score,
    feedback,
    ...recordingFields
  });

  if (!updated) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  if (recordingKey) await queueRecordingCompression(callId, recordingKey);

  return toCallDetail(updated, scenario);
}

async function queueRecordingCompression(callId: string, sourceKey: string) {
  try {
    await enqueueCompressPracticeRecording({ callId, sourceKey });
  } catch (error) {
    console.error('practice recording compression could not be queued:', error);
  }
}

function assertCallVisible(call: TPracticeCall, viewer: PracticeViewer) {
  const isOwner = call.profileId === viewer.userId;
  if (!isOwner && !isTeamMember(viewer.orgRoles, call.organizationId)) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }
}

function assertCallEnded(call: TPracticeCall) {
  if (call.status !== 'ENDED') {
    throw new AppError('Practice call has not ended', ErrorCodes.PRACTICE_CALL_NOT_ENDED, 409);
  }
}

/** Grades an ended call again with AI, replacing its AI score and feedback. Throws when grading fails. */
export async function regradePracticeCall(callId: string, viewer: PracticeViewer) {
  const { call, scenario } = await loadCallWithScenario(callId);
  const { voiceCallModel } = await getPracticeAiSettings(call.organizationId);
  assertPracticeModelConfigured(voiceCallModel);

  assertCallVisible(call, viewer);
  assertCallEnded(call);

  const feedback = await gradeTranscript(scenario, call);
  if (!feedback) {
    throw new AppError('Practice call could not be graded', ErrorCodes.PRACTICE_GRADING_FAILED, 502);
  }

  const updated = await updatePracticeCall(callId, { score: feedback.score, feedback });
  if (!updated) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  return toCallDetail(updated, scenario);
}

/** Saves a trainer's score and comment on an ended call in the trainer's organization. */
export async function reviewPracticeCall(
  orgId: string,
  callId: string,
  reviewerId: string,
  review: TPracticeCallReview
) {
  const { call, scenario } = await loadCallWithScenario(callId);

  if (call.organizationId !== orgId) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  assertCallEnded(call);

  const reviewedAt = new Date().toISOString();
  const updated = await updatePracticeCall(callId, {
    reviewScore: review.score,
    reviewComment: review.comment,
    reviewedBy: reviewerId,
    reviewedAt
  });
  if (!updated) {
    throw new AppError('Practice call not found', ErrorCodes.PRACTICE_CALL_NOT_FOUND, 404);
  }

  return toCallDetail(updated, scenario);
}

export async function listMyPracticeCalls(orgId: string, userId: string) {
  return listPracticeCallsForProfile(orgId, userId, HISTORY_LIMIT);
}

export async function listOrganizationPracticeCalls(orgId: string) {
  return listPracticeCallsForOrganization(orgId, RESULTS_LIMIT);
}
