import { redirect } from '@sveltejs/kit';
import { HELP_BASE_PATH } from '$features/help/help-markdown';

export const load = () => redirect(308, HELP_BASE_PATH);
