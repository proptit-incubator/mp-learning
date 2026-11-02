import type { MiddlewareHandler } from 'hono';

export const internalLearning: MiddlewareHandler = async (context, next) => {
  const pathname = context.req.path;
  const retiredEndpoint = /^\/(widgets|org-site)(\/|$)/.test(pathname);
  const publicCatalog = /^\/organization\/(courses|tags)\/public\/?$/.test(pathname);

  const publicSales = /^\/course\/(slug\/|[^/]+\/payment-request(?:\/|$))/.test(pathname);
  const retiredManagement =
    /^\/(onboarding|domain|license|payments|webhooks\/polar)(\/|$)/.test(pathname) ||
    /^\/account\/(workspaces|usage)(\/|$)/.test(pathname) ||
    /^\/organization\/join\/?$/.test(pathname) ||
    /^\/organization\/(plan|plans|setup|early-adopter)(\/|$)/.test(pathname) ||
    /^\/(?:public-api\/)?v1\/organization\/landing-page(\/|$)/.test(pathname);
  const organizationCreation = /^\/organization\/?$/.test(pathname) && ['POST', 'DELETE'].includes(context.req.method);
  const courseInvitations =
    /^\/course\/[^/]+\/invites(?:\/|$)/.test(pathname) ||
    /^\/(?:public-api\/)?v1\/courses\/[^/]+\/invites(?:\/|$)/.test(pathname) ||
    /^\/invite\/student(?:\/|$)/.test(pathname);
  const teamInvitations =
    /^\/organization\/(team\/invite|link-invite)\/?$/.test(pathname) ||
    (/^\/organization\/team\/[^/]+\/?$/.test(pathname) && ['PATCH', 'DELETE'].includes(context.req.method)) ||
    /^\/invite\/(link|r)(\/|$)/.test(pathname) ||
    /^\/invite\/organization\/(?!pending\/?$)/.test(pathname);

  if (
    retiredEndpoint ||
    publicCatalog ||
    publicSales ||
    retiredManagement ||
    organizationCreation ||
    courseInvitations ||
    teamInvitations
  ) {
    return context.json({ success: false, error: 'Not found' }, 404);
  }

  await next();
};
