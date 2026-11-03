type SignInError = { code?: string; status?: number; retryAfter?: number; message?: string } | null | undefined;

export type SignInErrorMessage = { key: string; params?: Record<string, number> };

/** Translation for a failed `signIn.email` call; the API's messages are English and name no lock duration. */
export function signInErrorMessage(error: SignInError): SignInErrorMessage {
  if (error?.code === 'SIGN_IN_LOCKED') {
    return { key: 'login.errors.locked', params: { minutes: Math.max(1, Math.ceil((error.retryAfter ?? 60) / 60)) } };
  }
  if (error?.status === 401 || error?.code === 'INVALID_EMAIL_OR_PASSWORD')
    return { key: 'login.errors.invalid_credentials' };
  if (error?.status === 403) return { key: 'login.errors.disabled' };
  if (error?.status === 429) return { key: 'login.errors.too_many_requests' };
  return { key: 'login.errors.unavailable' };
}
