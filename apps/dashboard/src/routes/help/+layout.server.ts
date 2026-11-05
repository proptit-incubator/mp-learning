import { getHelpNav } from '$features/help/content.server';

export const load = () => ({ helpNav: getHelpNav() });
