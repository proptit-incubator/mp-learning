import type { ViewAsStudentTokenRequest } from '../utils/types';
import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';

class AccountApi extends BaseApiWithErrors {
  /**
   * Mint a short-lived login-link token for the current user. Used by the
   * "View as student" handoff to auto-authenticate the teacher on the org domain.
   * Returns the token, or undefined on failure.
   */
  async createViewAsStudentToken(): Promise<string | undefined> {
    const result = await this.execute<ViewAsStudentTokenRequest>({
      requestFn: () => classroomio.account['view-as-student-token'].$post(),
      logContext: 'creating view-as-student token'
    });

    return result?.data.token;
  }
}

export const accountApi = new AccountApi();
