import { error } from '@sveltejs/kit';
import { getHelpArticle, getHelpCategory } from '$features/help/content.server';
import { BRAND } from '$lib/utils/constants/brand';

export const load = ({ params }) => {
  const found = getHelpArticle(params.category, params.slug);
  const category = getHelpCategory(params.category);
  if (!found || !category) error(404, 'Không tìm thấy bài viết');

  return {
    ...found,
    categoryTitle: category.title,
    categoryHref: category.href,
    pageMetaTags: {
      title: `${found.article.title} · Trợ giúp ${BRAND.product}`,
      description: found.article.description
    }
  };
};
