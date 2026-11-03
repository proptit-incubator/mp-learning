import { describe, expect, it, vi } from 'vitest';

vi.mock('@cio/core/utils/redis/redis', () => ({ redis: {} }));

import {
  clearSignInFailures,
  lockSecondsAfter,
  readSignInIdentity,
  recordSignInFailure,
  signInLockRemaining,
  type SignInLockoutStore
} from '@api/utils/sign-in-lockout';

function memoryStore(): SignInLockoutStore {
  const values = new Map<string, string>();
  const ttls = new Map<string, number>();
  return {
    get: async (key) => values.get(key) ?? null,
    incr: async (key) => {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, String(next));
      return next;
    },
    expire: async (key, seconds) => ttls.set(key, seconds),
    set: async (key, value, options) => {
      values.set(key, value);
      ttls.set(key, options.EX);
    },
    ttl: async (key) => (values.has(key) ? (ttls.get(key) ?? -1) : -2),
    del: async (keys) => keys.forEach((key) => values.delete(key))
  };
}

describe('sign-in lockout', () => {
  it('locks every fifth wrong password for longer, up to an hour', () => {
    expect([4, 5, 6, 10, 15, 20, 25, 50].map(lockSecondsAfter)).toEqual([0, 300, 0, 600, 1200, 2400, 3600, 3600]);
  });

  it('locks the account after five failures and forgets them after a successful sign-in', async () => {
    const store = memoryStore();
    for (let attempt = 1; attempt < 5; attempt++) expect(await recordSignInFailure('an@mp.vn', store)).toBe(0);
    expect(await signInLockRemaining('an@mp.vn', store)).toBe(0);

    expect(await recordSignInFailure('an@mp.vn', store)).toBe(300);
    expect(await signInLockRemaining('an@mp.vn', store)).toBe(300);
    expect(await signInLockRemaining('binh@mp.vn', store)).toBe(0);

    await clearSignInFailures('an@mp.vn', store);
    expect(await signInLockRemaining('an@mp.vn', store)).toBe(0);
    expect(await recordSignInFailure('an@mp.vn', store)).toBe(0);
  });

  it('reads the normalized email of email sign-ins only', async () => {
    const signIn = (path: string, body: unknown) =>
      new Request(`http://api.local/api/auth/${path}`, { method: 'POST', body: JSON.stringify(body) });

    expect(await readSignInIdentity(signIn('sign-in/email', { email: ' An@MP.vn ', password: 'x' }))).toBe('an@mp.vn');
    expect(await readSignInIdentity(signIn('sign-up/email', { email: 'an@mp.vn' }))).toBeNull();
    expect(await readSignInIdentity(signIn('sign-in/email', { password: 'x' }))).toBeNull();
  });
});
