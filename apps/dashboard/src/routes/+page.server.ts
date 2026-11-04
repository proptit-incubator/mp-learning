import { redirect } from '@sveltejs/kit';
import { homePathFor } from '$lib/utils/functions/routes/home-path';

export const load = ({ locals }) => {
  redirect(303, locals.user ? homePathFor(locals.orgRoles) : '/login');
};
