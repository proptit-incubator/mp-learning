import { BaseApi, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import { ZAiPolicyUpdate, type TAiPolicyUpdate } from '@cio/utils/validation/agent';
import type {
  AiPolicyData,
  AiUsageData,
  GetAiPolicyRequest,
  GetLeaderboardRequest,
  GetUsageRequest,
  LeaderboardData,
  UpdateAiPolicyRequest
} from '../utils/types';

class AiSettingsApi extends BaseApi {
  policy = $state<AiPolicyData | null>(null);
  usage = $state<AiUsageData | null>(null);
  leaderboard = $state<LeaderboardData | null>(null);
  saving = $state(false);

  async fetchAll() {
    await Promise.all([this.fetchPolicy(), this.fetchUsage(), this.fetchLeaderboard()]);
  }

  async fetchPolicy() {
    await this.execute<GetAiPolicyRequest>({
      requestFn: () => classroomio.organization['ai-policy'].$get(),
      logContext: 'fetching AI policy',
      onSuccess: (result) => {
        this.policy = result.data;
      }
    });
  }

  async fetchUsage() {
    await this.execute<GetUsageRequest>({
      requestFn: () => classroomio.agent.usage.$get(),
      logContext: 'fetching AI usage',
      onSuccess: (result) => {
        this.usage = result.data;
      }
    });
  }

  async fetchLeaderboard() {
    await this.execute<GetLeaderboardRequest>({
      requestFn: () => classroomio.agent.usage.leaderboard.$get(),
      logContext: 'fetching AI usage by person',
      onSuccess: (result) => {
        this.leaderboard = result.data;
      }
    });
  }

  async updatePolicy(patch: TAiPolicyUpdate) {
    const parsed = ZAiPolicyUpdate.safeParse(patch);
    if (!parsed.success) {
      snackbar.error('settings.ai.snackbar.invalid');
      return false;
    }

    this.saving = true;
    let saved = false;
    try {
      await this.execute<UpdateAiPolicyRequest>({
        requestFn: () => classroomio.organization['ai-policy'].$put({ json: parsed.data }),
        logContext: 'updating AI policy',
        onSuccess: (result) => {
          this.policy = result.data;
          saved = true;
          snackbar.success('settings.ai.snackbar.saved');
        }
      });
    } finally {
      this.saving = false;
    }

    if (saved) await this.fetchUsage();
    return saved;
  }
}

export const aiSettingsApi = new AiSettingsApi();
