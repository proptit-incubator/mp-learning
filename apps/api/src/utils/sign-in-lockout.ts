import { redis } from '@cio/core/utils/redis/redis';

export const SIGN_IN_FAILURES_PER_LOCK = 5;
const BASE_LOCK_SECONDS = 5 * 60;
const MAX_LOCK_SECONDS = 60 * 60;
const FAILURE_MEMORY_SECONDS = 24 * 60 * 60;

export type SignInLockoutStore = {
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  set(key: string, value: string, options: { EX: number }): Promise<unknown>;
  ttl(key: string): Promise<number>;
  del(keys: string[]): Promise<unknown>;
};

const failuresKey = (identity: string) => `sign-in:failures:${identity}`;
const lockKey = (identity: string) => `sign-in:lock:${identity}`;

export function normalizeSignInIdentity(identity: string): string {
  return identity.trim().toLowerCase();
}

/** Lock length after `failures` consecutive wrong passwords: 5, 10, 20, 40, then 60 minutes per further batch of 5. */
export function lockSecondsAfter(failures: number): number {
  if (failures < SIGN_IN_FAILURES_PER_LOCK || failures % SIGN_IN_FAILURES_PER_LOCK !== 0) return 0;
  const lockNumber = failures / SIGN_IN_FAILURES_PER_LOCK;
  return Math.min(BASE_LOCK_SECONDS * 2 ** (lockNumber - 1), MAX_LOCK_SECONDS);
}

/** Seconds the identity must still wait before another sign-in attempt, or 0. */
export async function signInLockRemaining(identity: string, store: SignInLockoutStore = redis): Promise<number> {
  const remaining = await store.ttl(lockKey(identity));
  return remaining > 0 ? remaining : 0;
}

/** Counts a wrong password and returns the lock it triggered, in seconds (0 when none). */
export async function recordSignInFailure(identity: string, store: SignInLockoutStore = redis): Promise<number> {
  const failures = await store.incr(failuresKey(identity));
  await store.expire(failuresKey(identity), FAILURE_MEMORY_SECONDS);

  const lockSeconds = lockSecondsAfter(failures);
  if (lockSeconds > 0) await store.set(lockKey(identity), String(failures), { EX: lockSeconds });
  return lockSeconds;
}

export async function clearSignInFailures(identity: string, store: SignInLockoutStore = redis): Promise<void> {
  await store.del([failuresKey(identity), lockKey(identity)]);
}

/** The email the sign-in request names, normalized, or null for requests that are not email sign-ins. */
export async function readSignInIdentity(request: Request): Promise<string | null> {
  if (request.method !== 'POST' || !new URL(request.url).pathname.endsWith('/sign-in/email')) return null;

  try {
    const body: unknown = await request.clone().json();
    if (!body || typeof body !== 'object' || !('email' in body) || typeof body.email !== 'string') return null;
    return normalizeSignInIdentity(body.email);
  } catch {
    return null;
  }
}
