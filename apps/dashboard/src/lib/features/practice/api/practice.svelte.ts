import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import {
  ZPracticeCallReview,
  ZPracticeScenarioCreate,
  ZPracticeScenarioUpdate,
  type TPracticeCallReview,
  type TPracticeScenarioAssistantRequest,
  type TPracticeScenarioAssistantReply,
  type TPracticeScenarioCreate,
  type TPracticeStatsRange,
  type TPracticeScenarioUpdate
} from '@cio/utils/validation/practice';
import { mapZodErrorsToTranslations } from '$lib/utils/validation';
import { snackbar } from '$features/ui/snackbar/store';
import { t } from '$lib/utils/functions/translations';
import type {
  AddSamplePracticeScenariosRequest,
  CreatePracticeScenarioRequest,
  DeletePracticeScenarioRequest,
  EndPracticeCallRequest,
  GetManagedPracticeScenariosRequest,
  GetMyPracticeStatsRequest,
  GetPracticeOrgStatsRequest,
  GetPracticeCallRequest,
  GetPracticeCapabilitiesRequest,
  GetPracticeHistoryRequest,
  GetPracticeResultsRequest,
  GetPracticeScenariosRequest,
  ManagedPracticeScenario,
  RunPracticeAssistantRequest,
  MyPracticeStats,
  PracticeCallDetail,
  PracticeCallSummary,
  PracticeCapabilities,
  PracticeOrgStats,
  PracticeResult,
  PracticeScenario,
  RegradePracticeCallRequest,
  ReviewPracticeCallRequest,
  StartPracticeCallRequest,
  UpdatePracticeScenarioRequest
} from '../utils/types';

function reportError(result: unknown, fallbackKey: string) {
  if (typeof result === 'object' && result !== null && 'code' in result) {
    const code = String((result as { code: unknown }).code);
    if (code === 'PRACTICE_AI_NOT_CONFIGURED') {
      snackbar.error('practice.errors.ai_not_configured');

      return;
    }
  }

  snackbar.error(fallbackKey);
}

class PracticeApi extends BaseApiWithErrors {
  scenarios = $state<PracticeScenario[] | null>(null);
  capabilities = $state<PracticeCapabilities | null>(null);
  history = $state<PracticeCallSummary[] | null>(null);
  managedScenarios = $state<ManagedPracticeScenario[] | null>(null);
  results = $state<PracticeResult[] | null>(null);
  isSaving = $state(false);
  myStats = $state<MyPracticeStats | null>(null);
  orgStats = $state<PracticeOrgStats | null>(null);
  isLoadingOrgStats = $state(false);
  isGrading = $state(false);
  isSavingReview = $state(false);

  async loadCatalog() {
    await Promise.all([this.listScenarios(), this.loadCapabilities(), this.listHistory(), this.loadMyStats()]);
  }

  async listScenarios() {
    return this.execute<GetPracticeScenariosRequest>({
      requestFn: () => classroomio.practice.scenarios.$get(),
      logContext: 'fetching practice scenarios',
      onSuccess: (response) => {
        this.scenarios = response.data;
      },
      onError: () => {
        this.scenarios = [];
        snackbar.error('practice.errors.load_failed');
      }
    });
  }

  async loadCapabilities() {
    return this.execute<GetPracticeCapabilitiesRequest>({
      requestFn: () => classroomio.practice.calls.capabilities.$get(),
      logContext: 'fetching practice capabilities',
      onSuccess: (response) => {
        this.capabilities = response.data;
      }
    });
  }

  async listHistory() {
    return this.execute<GetPracticeHistoryRequest>({
      requestFn: () => classroomio.practice.calls.$get(),
      logContext: 'fetching practice history',
      onSuccess: (response) => {
        this.history = response.data;
      },
      onError: () => {
        this.history = [];
      }
    });
  }

  async startCall(scenarioId: string): Promise<PracticeCallDetail | null> {
    const result = await this.execute<StartPracticeCallRequest>({
      requestFn: () => classroomio.practice.calls.$post({ json: { scenarioId } }),
      logContext: 'starting practice call',
      onError: (error) => reportError(error, 'practice.errors.start_failed')
    });

    return result?.data ?? null;
  }

  async getCall(callId: string): Promise<PracticeCallDetail | null> {
    const result = await this.execute<GetPracticeCallRequest>({
      requestFn: () => classroomio.practice.calls[':callId'].$get({ param: { callId } }),
      logContext: 'fetching practice call',
      onError: () => snackbar.error('practice.errors.call_not_found')
    });

    return result?.data ?? null;
  }

  async endCall(callId: string): Promise<PracticeCallDetail | null> {
    const result = await this.execute<EndPracticeCallRequest>({
      requestFn: () => classroomio.practice.calls[':callId'].end.$post({ param: { callId } }),
      logContext: 'ending practice call',
      onError: () => snackbar.error('practice.errors.end_failed')
    });

    return result?.data ?? null;
  }

  async loadMyStats() {
    return this.execute<GetMyPracticeStatsRequest>({
      requestFn: () => classroomio.practice.calls.stats.$get(),
      logContext: 'fetching practice stats',
      onSuccess: (response) => {
        this.myStats = response.data;
      },
      onError: () => {
        this.myStats = null;
      }
    });
  }

  async loadOrgStats(range: TPracticeStatsRange) {
    this.isLoadingOrgStats = true;
    await this.execute<GetPracticeOrgStatsRequest>({
      requestFn: () => classroomio.practice.calls.results.stats.$get({ query: { range } }),
      logContext: 'fetching practice organization stats',
      onSuccess: (response) => {
        this.orgStats = response.data;
      },
      onError: () => snackbar.error('practice.errors.load_failed')
    });
    this.isLoadingOrgStats = false;
  }

  /** Grades an ended call again with AI. Resolves null after showing an error. */
  async regradeCall(callId: string): Promise<PracticeCallDetail | null> {
    this.isGrading = true;
    const result = await this.execute<RegradePracticeCallRequest>({
      requestFn: () => classroomio.practice.calls[':callId'].grade.$post({ param: { callId } }),
      logContext: 'regrading practice call',
      onError: (error) => reportError(error, 'practice.errors.grade_failed')
    });
    this.isGrading = false;

    return result?.data ?? null;
  }

  /** Saves the trainer's own score and comment on a call. Resolves null when it was not saved. */
  async reviewCall(callId: string, review: TPracticeCallReview): Promise<PracticeCallDetail | null> {
    const parsed = ZPracticeCallReview.safeParse(review);
    if (!parsed.success) {
      this.errors = mapZodErrorsToTranslations(parsed.error);

      return null;
    }

    this.isSavingReview = true;
    const result = await this.execute<ReviewPracticeCallRequest>({
      requestFn: () => classroomio.practice.calls[':callId'].review.$put({ param: { callId }, json: parsed.data }),
      logContext: 'saving practice call review',
      onSuccess: () => snackbar.success('practice.trainer_review.saved'),
      onError: () => snackbar.error('practice.trainer_review.save_failed')
    });
    this.isSavingReview = false;

    return result?.data ?? null;
  }

  /** Asks the AI to draft or revise a scenario. Resolves null after showing an error. */
  async runAssistant(request: TPracticeScenarioAssistantRequest): Promise<TPracticeScenarioAssistantReply | null> {
    const result = await this.execute<RunPracticeAssistantRequest>({
      requestFn: () => classroomio.practice.scenarios.assistant.$post({ json: request }),
      logContext: 'running practice scenario assistant',
      onError: (error) => reportError(error, 'practice.assistant.failed')
    });

    return result?.data ?? null;
  }

  /** Loads every scenario for L&D. `silent` skips the error snackbar for pages where the list is optional. */
  async listManagedScenarios(silent = false) {
    return this.execute<GetManagedPracticeScenariosRequest>({
      requestFn: () => classroomio.practice.scenarios.manage.$get(),
      logContext: 'fetching managed practice scenarios',
      onSuccess: (response) => {
        this.managedScenarios = response.data;
      },
      onError: () => {
        this.managedScenarios = [];
        if (!silent) snackbar.error('practice.errors.load_failed');
      }
    });
  }

  async listResults() {
    return this.execute<GetPracticeResultsRequest>({
      requestFn: () => classroomio.practice.calls.results.$get(),
      logContext: 'fetching practice results',
      onSuccess: (response) => {
        this.results = response.data;
      },
      onError: () => {
        this.results = [];
        snackbar.error('practice.errors.load_failed');
      }
    });
  }

  async createScenario(fields: TPracticeScenarioCreate): Promise<boolean> {
    const parsed = ZPracticeScenarioCreate.safeParse(fields);
    if (!parsed.success) {
      this.errors = mapZodErrorsToTranslations(parsed.error);

      return false;
    }

    this.isSaving = true;
    const result = await this.execute<CreatePracticeScenarioRequest>({
      requestFn: () => classroomio.practice.scenarios.$post({ json: parsed.data }),
      logContext: 'creating practice scenario',
      onSuccess: () => snackbar.success('practice.admin.snackbar.created'),
      onError: (error) => this.handleSaveError(error)
    });
    this.isSaving = false;

    if (!result) return false;

    await this.listManagedScenarios();

    return true;
  }

  async updateScenario(scenarioId: string, fields: TPracticeScenarioUpdate, successKey?: string): Promise<boolean> {
    const parsed = ZPracticeScenarioUpdate.safeParse(fields);
    if (!parsed.success) {
      this.errors = mapZodErrorsToTranslations(parsed.error);

      return false;
    }

    this.isSaving = true;
    const result = await this.execute<UpdatePracticeScenarioRequest>({
      requestFn: () => classroomio.practice.scenarios[':scenarioId'].$put({ param: { scenarioId }, json: parsed.data }),
      logContext: 'updating practice scenario',
      onSuccess: () => snackbar.success(successKey ?? 'practice.admin.snackbar.updated'),
      onError: (error) => this.handleSaveError(error)
    });
    this.isSaving = false;

    if (!result) return false;

    await this.listManagedScenarios();

    return true;
  }

  async addSampleScenarios() {
    this.isSaving = true;
    const result = await this.execute<AddSamplePracticeScenariosRequest>({
      requestFn: () => classroomio.practice.scenarios.samples.$post(),
      logContext: 'adding sample practice scenarios',
      onSuccess: (response) => {
        const { added } = response.data;

        if (added === 0) {
          snackbar.info('practice.admin.snackbar.samples_exist');

          return;
        }

        snackbar.success(t.get('practice.admin.snackbar.samples_added', { count: added }));
      },
      onError: () => snackbar.error('practice.admin.snackbar.samples_failed')
    });
    this.isSaving = false;

    if (result) await this.listManagedScenarios();
  }

  async deleteScenario(scenarioId: string): Promise<boolean> {
    this.isSaving = true;
    const result = await this.execute<DeletePracticeScenarioRequest>({
      requestFn: () => classroomio.practice.scenarios[':scenarioId'].$delete({ param: { scenarioId } }),
      logContext: 'deleting practice scenario',
      onSuccess: () => snackbar.success('practice.admin.snackbar.deleted'),
      onError: () => snackbar.error('practice.admin.snackbar.delete_failed')
    });
    this.isSaving = false;

    if (!result) return false;

    await this.listManagedScenarios();

    return true;
  }

  private handleSaveError(error: unknown) {
    if (typeof error === 'object' && error !== null && 'field' in error) {
      const { field, error: message } = error as { field?: string; error?: string };

      if (field && message) {
        this.errors[field] = message;

        return;
      }
    }

    snackbar.error('practice.admin.snackbar.save_failed');
  }
}

export const practiceApi = new PracticeApi();
