import { describe, expect, it } from 'vitest';
import { signInErrorMessage } from './sign-in-error';

describe('signInErrorMessage', () => {
  it('rounds the lock up to whole minutes', () => {
    expect(signInErrorMessage({ code: 'SIGN_IN_LOCKED', status: 429, retryAfter: 61 })).toEqual({
      key: 'login.errors.locked',
      params: { minutes: 2 }
    });
  });

  it.each([
    [{ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD' }, 'login.errors.invalid_credentials'],
    [{ status: 403 }, 'login.errors.disabled'],
    [{ status: 429 }, 'login.errors.too_many_requests'],
    [{ status: 503 }, 'login.errors.unavailable'],
    [undefined, 'login.errors.unavailable']
  ])('maps %o to %s', (error, key) => {
    expect(signInErrorMessage(error).key).toBe(key);
  });
});
