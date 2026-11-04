import { redirect } from '@sveltejs/kit';

export const load = ({ params }) => {
  redirect(308, `/employees?profileId=${encodeURIComponent(params.params?.split('/')[0] ?? '')}`);
};
