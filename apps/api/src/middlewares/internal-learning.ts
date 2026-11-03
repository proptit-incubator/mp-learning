import type { MiddlewareHandler } from 'hono';

const AUTH_ENDPOINTS = [
  'get-session',
  'sign-in/email',
  'sign-in/social',
  'callback/google',
  'sign-out',
  'sign-up/email',
  'request-password-reset',
  'reset-password(?:/[^/]+)?',
  'change-password',
  'change-email',
  'update-user',
  'send-verification-email',
  'verify-email',
  'login-link',
  'list-sessions',
  'revoke-session',
  'revoke-sessions',
  'revoke-other-sessions'
];

const ALLOWED_PATHS = [
  /^\/(?:docs|health)?$/,
  /^\/session\/?$/,
  new RegExp(`^/api/auth/(?:${AUTH_ENDPOINTS.join('|')})/?$`),
  /^\/(account|employees|course|certificate|hls|transcripts|media|jobs|mail|organization|dash|community|report|internal|agent)(\/|$)/,
  /^\/public-api\/v1(\/|$)/,
  /^\/invite\/organization\/pending\/?$/,
  /^\/admin\/queues(\/|$)/
];

const RETIRED_PATHS = [
  /^\/course\/(slug\/|[^/]+\/payment-request(?:\/|$))/,
  /^\/course\/[^/]+\/invites(?:\/|$)/,
  /^\/public-api\/v1\/courses\/[^/]+\/invites(?:\/|$)/,
  /^\/public-api\/v1\/organization\/landing-page(\/|$)/,
  /^\/account\/(workspaces|usage|invites)(\/|$)/,
  /^\/organization\/(courses|tags)\/public\/?$/,
  /^\/organization\/(join|plan|plans|setup|early-adopter|team\/invite|link-invite)(\/|$)/,
  /^\/organization\/(sso|token-auth|widgets)(\/|$)/,
  /^\/dash\/track(\/|$)/,
  /^\/agent\/credits\/purchase(\/|$)/
];

/**
 * MP Learning serves only the routes listed here. Anything else, including routes that upstream ClassroomIO adds
 * later, answers 404 until it is reviewed and added.
 */
export function isServedPath(method: string, pathname: string): boolean {
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(pathname))) return false;
  if (RETIRED_PATHS.some((pattern) => pattern.test(pathname))) return false;

  const organizationCreation = /^\/organization\/?$/.test(pathname) && ['POST', 'DELETE'].includes(method);
  const teamMembershipChange =
    /^\/organization\/team\/[^/]+\/?$/.test(pathname) && ['PATCH', 'DELETE'].includes(method);

  return !organizationCreation && !teamMembershipChange;
}

export const internalLearning: MiddlewareHandler = async (context, next) => {
  if (!isServedPath(context.req.method, context.req.path)) {
    return context.json({ success: false, error: 'Not found' }, 404);
  }

  await next();
};
