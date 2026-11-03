import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isManagedEmployeeAccount: vi.fn(),
  getProfileById: vi.fn(),
  updateProfile: vi.fn()
}));

vi.mock('@cio/db/queries/organization', () => ({
  isManagedEmployeeAccount: mocks.isManagedEmployeeAccount,
  getOrganizationByProfileId: vi.fn()
}));
vi.mock('@cio/db/queries/auth', () => ({
  getProfileById: mocks.getProfileById,
  updateProfile: mocks.updateProfile,
  getProfileByEmail: vi.fn(),
  syncProfileEmailVerificationFromAuthUser: vi.fn()
}));
vi.mock('@cio/core/services/license', () => ({ getLicenseStatus: vi.fn() }));
vi.mock('@api/services/learning-instance', () => ({ ensureLearningInstance: vi.fn() }));

import { changesManagedIdentity } from '@api/utils/managed-identity';
import { updateUser } from '@api/services/account/profile';

const user = { id: 'profile-1', name: 'Nguyễn Văn An' };
const authRequest = (path: string, body: unknown) =>
  new Request(`http://api.local/api/auth/${path}`, { method: 'POST', body: JSON.stringify(body) });

describe('identity managed by HR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isManagedEmployeeAccount.mockResolvedValue(true);
    mocks.getProfileById.mockResolvedValue({ id: 'profile-1', fullname: 'Nguyễn Văn An' });
    mocks.updateProfile.mockResolvedValue({ id: 'profile-1' });
  });

  it('refuses an employee changing their email or name through auth', async () => {
    expect(await changesManagedIdentity(authRequest('change-email', { newEmail: 'x@mp.vn' }), user)).toBe(true);
    expect(await changesManagedIdentity(authRequest('update-user', { name: 'Tên khác' }), user)).toBe(true);
  });

  it('lets an employee change their avatar and resend an unchanged name', async () => {
    expect(await changesManagedIdentity(authRequest('update-user', { image: 'https://cdn/a.png' }), user)).toBe(false);
    expect(await changesManagedIdentity(authRequest('update-user', { name: ' Nguyễn Văn An ' }), user)).toBe(false);
  });

  it('leaves accounts without an employee record alone', async () => {
    mocks.isManagedEmployeeAccount.mockResolvedValue(false);
    expect(await changesManagedIdentity(authRequest('change-email', { newEmail: 'x@mp.vn' }), user)).toBe(false);
  });

  it('refuses a profile name change for employees but saves other fields', async () => {
    await expect(updateUser('profile-1', { fullname: 'Tên khác' })).rejects.toMatchObject({ statusCode: 403 });
    await expect(updateUser('profile-1', { fullname: 'Nguyễn Văn An', locale: 'vi' })).resolves.toEqual({
      id: 'profile-1'
    });
  });
});
