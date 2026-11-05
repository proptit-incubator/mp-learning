import { error } from '@sveltejs/kit';
import { getHelpCategory } from '$features/help/content.server';
import { BRAND } from '$lib/utils/constants/brand';

export const load = ({ params }) => {
  const category = getHelpCategory(params.category);
  if (!category) error(404, 'Không tìm thấy chuyên mục');

  return {
    category,
    pageMetaTags: {
      title: `${category.title} · Trung tâm trợ giúp ${BRAND.product}`,
      description: category.description
    }
  };
};
