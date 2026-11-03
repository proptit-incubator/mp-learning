import { isManagedEmployeeAccount } from '@cio/db/queries/organization';

type SessionUser = { id: string; name?: string | null };

async function requestedName(request: Request): Promise<string | undefined> {
  try {
    const body: unknown = await request.clone().json();
    if (body && typeof body === 'object' && 'name' in body && typeof body.name === 'string') return body.name;
  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Whether an auth request would change the email or name of an account HR manages. Employees keep their avatar and
 * password; their identity comes from the employee record so it matches HR data and the name printed on certificates.
 */
export async function changesManagedIdentity(request: Request, user: SessionUser | null): Promise<boolean> {
  if (!user || request.method !== 'POST') return false;

  const pathname = new URL(request.url).pathname;
  const changesEmail = pathname.endsWith('/change-email');
  const updatesUser = pathname.endsWith('/update-user');
  if (!changesEmail && !updatesUser) return false;

  if (updatesUser) {
    const name = await requestedName(request);
    if (name === undefined || name.trim() === (user.name ?? '').trim()) return false;
  }

  return isManagedEmployeeAccount(user.id);
}
