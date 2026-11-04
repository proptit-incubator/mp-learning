import { error } from '@sveltejs/kit';
import { ORG_ROUTE_SLUG } from '$lib/utils/functions/routes/org-routes';

export const load = async ({ params, parent }) => {
  const { org } = await parent();
  if (!org) error(503, 'MP Learning is not initialized');

  if (params.slug !== ORG_ROUTE_SLUG) error(404, 'Not found');

  return { orgName: org.siteName, orgId: org.id };
};
