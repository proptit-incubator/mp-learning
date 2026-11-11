import { createHash } from 'node:crypto';
import { getEmployeeByIdentity } from '@cio/db/queries/organization';

/**
 * An address no account owns, distinct per identity so a refused sign-in fails like a wrong password while each
 * account or typed code keeps its own lockout counter.
 */
function unusableSignInEmail(key: string) {
  const digest = createHash('sha256').update(key).digest('hex').slice(0, 32);

  return `refused-${digest}@example.invalid`;
}

export async function resolveEmployeeSignInRequest(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (request.method !== 'POST' || !pathname.endsWith('/sign-in/email')) return request;

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return request;
  }
  if (!body || typeof body !== 'object' || !('email' in body) || typeof body.email !== 'string') return request;

  const identity = body.email.trim();
  const match = await getEmployeeByIdentity(identity);
  const allowed =
    match?.employee.status === 'ACTIVE' && match.member.status === 'ACTIVE' && !!match.employee.activatedAt;
  const email = match
    ? allowed
      ? match.employee.email
      : unusableSignInEmail(`employee:${match.employee.id}`)
    : identity.includes('@')
      ? identity
      : unusableSignInEmail(`identity:${identity.toLowerCase()}`);
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  const normalizedBody = JSON.stringify({ ...body, email });
  return new Request(request.url, { method: request.method, headers, body: normalizedBody });
}
