import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cio/db/queries/organization', () => ({ getEmployeeByIdentity: vi.fn() }));

import { getEmployeeByIdentity } from '@cio/db/queries/organization';
import { resolveEmployeeSignInRequest } from '@api/utils/employee-sign-in';
import { readSignInIdentity } from '@api/utils/sign-in-lockout';

const signIn = (email: string) =>
  new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'x' })
  });

const employee = (id: string, overrides: { status?: string; activatedAt?: string | null } = {}) => ({
  employee: {
    id,
    email: `${id}@mp.test`,
    status: overrides.status ?? 'ACTIVE',
    activatedAt: overrides.activatedAt === undefined ? '2026-01-01' : overrides.activatedAt
  },
  member: { status: 'ACTIVE' }
});

async function lockoutKeyFor(identity: string) {
  const resolved = await resolveEmployeeSignInRequest(signIn(identity));

  return readSignInIdentity(resolved);
}

describe('resolveEmployeeSignInRequest', () => {
  beforeEach(() => {
    vi.mocked(getEmployeeByIdentity).mockReset();
  });

  it('signs an active employee in with their email', async () => {
    vi.mocked(getEmployeeByIdentity).mockResolvedValue(employee('an') as never);

    expect(await lockoutKeyFor('MP001')).toBe('an@mp.test');
  });

  it('gives refused accounts and unknown codes separate lockout counters', async () => {
    vi.mocked(getEmployeeByIdentity).mockImplementation(async (identity: string) => {
      if (identity === 'MP002') return employee('binh', { status: 'SUSPENDED' }) as never;
      if (identity === 'MP003') return employee('chi', { activatedAt: null }) as never;
      return null as never;
    });

    const keys = await Promise.all(['MP002', 'MP003', 'MP404', 'MP405'].map(lockoutKeyFor));

    expect(new Set(keys).size).toBe(4);
    keys.forEach((key) => expect(key).toMatch(/@example\.invalid$/));
  });

  it('keeps one counter per refused account whichever identity is typed', async () => {
    vi.mocked(getEmployeeByIdentity).mockResolvedValue(employee('binh', { status: 'SUSPENDED' }) as never);

    expect(await lockoutKeyFor('MP002')).toBe(await lockoutKeyFor('binh@mp.test'));
  });

  it('treats an unknown code the same in any letter case', async () => {
    vi.mocked(getEmployeeByIdentity).mockResolvedValue(null as never);

    expect(await lockoutKeyFor('mp404')).toBe(await lockoutKeyFor('MP404'));
  });
});
