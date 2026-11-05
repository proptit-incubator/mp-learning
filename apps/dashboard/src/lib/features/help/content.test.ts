import { describe, expect, it } from 'vitest';
import { HELP_CATEGORIES } from './categories';
import { getHelpArticle, getHelpNav } from './content.server';
import { HELP_BASE_PATH } from './help-markdown';

const nav = getHelpNav();
const articles = nav.flatMap((category) =>
  category.articles.map((summary) => getHelpArticle(category.slug, summary.slug)!.article)
);

describe('help center content', () => {
  it('has articles in every section', () => {
    expect(nav.map((category) => category.slug)).toEqual(HELP_CATEGORIES.map((category) => category.slug));
  });

  it('gives every article a title and description', () => {
    for (const article of articles) {
      expect(article.title, article.href).not.toBe(article.slug);
      expect(article.description, article.href).not.toBe('');
    }
  });

  it('only links to help pages and headings that exist', () => {
    const anchors = new Map(articles.map((article) => [article.href, new Set(article.toc.map((entry) => entry.id))]));
    const categoryPaths = new Set(nav.map((category) => category.href));
    const broken: string[] = [];

    for (const article of articles) {
      for (const [, href] of article.html.matchAll(/href="([^"]+)"/g)) {
        if (!href.startsWith(HELP_BASE_PATH)) continue;
        const [path, hash] = href.split('#');

        if (categoryPaths.has(path) || path === HELP_BASE_PATH) {
          if (hash) broken.push(`${article.href} → ${href}`);
          continue;
        }

        const target = anchors.get(path);
        if (!target || (hash && !target.has(hash))) broken.push(`${article.href} → ${href}`);
      }
    }

    expect(broken).toEqual([]);
  });

  it('never names removed features', () => {
    const banned = /giảng viên|khoá|nhóm phụ trách|tuân thủ|cohort|landing page/i;
    const offenders = articles.filter((article) => banned.test(article.html)).map((article) => article.href);
    expect(offenders).toEqual([]);
  });
});
