import { redirect } from '@sveltejs/kit';
import { afterSignInPath } from '$lib/utils/functions/routes/home-path';

export const load = ({ locals, url }) => {
  if (locals.user) redirect(303, afterSignInPath(url.searchParams.get('redirect'), locals.orgRoles));
};
