import type { Reroute } from '@sveltejs/kit';
import { orgSectionRoute } from '$lib/utils/functions/routes/org-routes';

export const reroute: Reroute = ({ url }) => orgSectionRoute(url.pathname);
