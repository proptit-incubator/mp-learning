import { classroomio, type InferResponseType } from '$lib/utils/services/api';
import type { TPracticeNoticeCode, TPracticeSpeaker } from '@cio/utils/validation/practice';

export type GetPracticeScenariosRequest = typeof classroomio.practice.scenarios.$get;
export type GetManagedPracticeScenariosRequest = typeof classroomio.practice.scenarios.manage.$get;
export type CreatePracticeScenarioRequest = typeof classroomio.practice.scenarios.$post;
export type UpdatePracticeScenarioRequest = (typeof classroomio.practice.scenarios)[':scenarioId']['$put'];
export type DeletePracticeScenarioRequest = (typeof classroomio.practice.scenarios)[':scenarioId']['$delete'];
export type AddSamplePracticeScenariosRequest = typeof classroomio.practice.scenarios.samples.$post;

export type GetPracticeCapabilitiesRequest = typeof classroomio.practice.calls.capabilities.$get;
export type GetPracticeHistoryRequest = typeof classroomio.practice.calls.$get;
export type GetPracticeResultsRequest = typeof classroomio.practice.calls.results.$get;
export type StartPracticeCallRequest = typeof classroomio.practice.calls.$post;
export type GetPracticeCallRequest = (typeof classroomio.practice.calls)[':callId']['$get'];
export type RunPracticeAssistantRequest = (typeof classroomio.practice.scenarios)['assistant']['$post'];
export type EndPracticeCallRequest = (typeof classroomio.practice.calls)[':callId']['end']['$post'];
export type RegradePracticeCallRequest = (typeof classroomio.practice.calls)[':callId']['grade']['$post'];
export type ReviewPracticeCallRequest = (typeof classroomio.practice.calls)[':callId']['review']['$put'];
export type GetMyPracticeStatsRequest = typeof classroomio.practice.calls.stats.$get;
export type GetPracticeOrgStatsRequest = typeof classroomio.practice.calls.results.stats.$get;

type SuccessData<TRequest> = Extract<InferResponseType<TRequest>, { success: true }>['data'];

export type PracticeScenario = SuccessData<GetPracticeScenariosRequest>[number];
export type ManagedPracticeScenario = SuccessData<GetManagedPracticeScenariosRequest>[number];
export type PracticeCapabilities = SuccessData<GetPracticeCapabilitiesRequest>;
export type PracticeCallSummary = SuccessData<GetPracticeHistoryRequest>[number];
export type PracticeResult = SuccessData<GetPracticeResultsRequest>[number];
export type PracticeCallDetail = SuccessData<GetPracticeCallRequest>;
export type PracticeCallScenario = PracticeCallDetail['scenario'];
export type PracticeFeedback = NonNullable<PracticeCallDetail['feedback']>;
export type PracticeCallReview = NonNullable<PracticeCallDetail['review']>;
export type MyPracticeStats = SuccessData<GetMyPracticeStatsRequest>;
export type PracticeOrgStats = SuccessData<GetPracticeOrgStatsRequest>;
export type PracticeCriterionAverage = MyPracticeStats['criteria'][number];
export type PracticeDailyCalls = MyPracticeStats['activity'][number];
export type PracticeLearnerStats = PracticeOrgStats['learners'][number];

export interface PracticeReviewDraft {
  score: number | null;
  comment: string;
}

export type PracticeDifficultyFilter = 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';

export type PracticeCallPhase = 'idle' | 'connecting' | 'live' | 'ending' | 'ended' | 'failed';

export type PracticeCallFailure = 'connection_lost' | 'refused' | 'replaced' | 'start_failed';

export interface PracticeChatMessage {
  id: string;
  speaker: TPracticeSpeaker;
  text: string;
  pending: boolean;
  offsetSeconds?: number;
}

export type PracticeNotice = TPracticeNoticeCode | 'MIC_DENIED';

export interface PracticeAssistantChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Local status note (e.g. "saved"); shown in the chat but never sent to the AI. */
  isNotice?: boolean;
}

export interface PracticeScenarioDraft {
  title: string;
  summary: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  customerName: string;
  persona: string;
  hiddenContext: string;
  objective: string;
  tip: string;
  openingLine: string;
  evaluationCriteria: string;
  voiceId: string;
  isPublished: boolean;
}
