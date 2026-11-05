import { getHelpSearchIndex } from '$features/help/content.server';
import { BRAND } from '$lib/utils/constants/brand';

export const load = () => ({
  searchIndex: getHelpSearchIndex(),
  pageMetaTags: {
    title: `Trung tâm trợ giúp · ${BRAND.product}`,
    description: `Hướng dẫn sử dụng ${BRAND.product} cho nhân viên, HR, L&D và Admin.`
  }
});
