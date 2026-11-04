import { ROLE } from '@cio/utils/constants';
import { safeRedirectPath } from '@cio/utils/functions/links';

/** Where a signed-in person lands: administrators and L&D on the training dashboard, everyone else on their learning. */
export function homePathFor(orgRoles: Record<string, number> | undefined): string {
  const roles = Object.values(orgRoles ?? {});

  return roles.some((roleId) => roleId === ROLE.ADMIN || roleId === ROLE.TUTOR) ? '/dash' : '/lms';
}

/** The page to open after signing in: the requested `redirect` when it is a safe local path, else the home page. */
export function afterSignInPath(redirect: string | null, orgRoles: Record<string, number> | undefined): string {
  const requested = safeRedirectPath(redirect);

  return requested === '/' || requested.startsWith('/login') ? homePathFor(orgRoles) : requested;
}
