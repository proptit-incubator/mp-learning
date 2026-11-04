import { redirect } from '@sveltejs/kit';
export const load = ({ params, url }) => {
  throw redirect(307, `/automation/api${url.search}`);
};
