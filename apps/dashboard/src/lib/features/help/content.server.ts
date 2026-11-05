import { HELP_CATEGORIES, type HelpCategory } from './categories';
import { HELP_BASE_PATH, parseHelpFrontmatter, renderHelpMarkdown, type HelpTocEntry } from './help-markdown';

export interface HelpArticleSummary {
  category: string;
  slug: string;
  title: string;
  description: string;
  audience: string;
  href: string;
}

export interface HelpArticle extends HelpArticleSummary {
  html: string;
  toc: HelpTocEntry[];
}

export interface HelpNavCategory extends HelpCategory {
  href: string;
  articles: HelpArticleSummary[];
}

export interface HelpSearchEntry extends HelpArticleSummary {
  categoryTitle: string;
  headings: string;
  text: string;
}

interface LoadedArticle extends HelpArticle {
  order: number;
  text: string;
}

const sources = import.meta.glob<string>('./articles/*/*.md', { query: '?raw', import: 'default', eager: true });

function loadArticles(): LoadedArticle[] {
  const known = new Set(HELP_CATEGORIES.map((category) => category.slug));
  const articles: LoadedArticle[] = [];

  for (const [path, source] of Object.entries(sources)) {
    const match = /\.\/articles\/([^/]+)\/([^/]+)\.md$/.exec(path);
    if (!match || !known.has(match[1])) continue;

    const [, category, slug] = match;
    const { frontmatter, body } = parseHelpFrontmatter(source);
    const { html, toc, text } = renderHelpMarkdown(body);

    articles.push({
      category,
      slug,
      title: frontmatter.title || slug,
      description: frontmatter.description,
      audience: frontmatter.audience,
      order: frontmatter.order,
      href: `${HELP_BASE_PATH}/${category}/${slug}`,
      html,
      toc,
      text
    });
  }

  const categoryIndex = new Map(HELP_CATEGORIES.map((category, index) => [category.slug, index]));
  return articles.sort(
    (a, b) =>
      (categoryIndex.get(a.category) ?? 0) - (categoryIndex.get(b.category) ?? 0) ||
      a.order - b.order ||
      a.title.localeCompare(b.title, 'vi')
  );
}

const ARTICLES = loadArticles();

function toSummary({ category, slug, title, description, audience, href }: LoadedArticle): HelpArticleSummary {
  return { category, slug, title, description, audience, href };
}

/** Every section with its articles in reading order; sections without articles are left out. */
export function getHelpNav(): HelpNavCategory[] {
  return HELP_CATEGORIES.map((category) => ({
    ...category,
    href: `${HELP_BASE_PATH}/${category.slug}`,
    articles: ARTICLES.filter((article) => article.category === category.slug).map(toSummary)
  })).filter((category) => category.articles.length > 0);
}

export function getHelpCategory(slug: string): HelpNavCategory | undefined {
  return getHelpNav().find((category) => category.slug === slug);
}

/** The article with its neighbours in reading order across all sections. */
export function getHelpArticle(
  category: string,
  slug: string
): { article: HelpArticle; previous?: HelpArticleSummary; next?: HelpArticleSummary } | undefined {
  const index = ARTICLES.findIndex((article) => article.category === category && article.slug === slug);
  if (index === -1) return undefined;

  const { order: _order, text: _text, ...article } = ARTICLES[index];
  const previous = ARTICLES[index - 1];
  const next = ARTICLES[index + 1];

  return {
    article,
    previous: previous ? toSummary(previous) : undefined,
    next: next ? toSummary(next) : undefined
  };
}

export function getHelpSearchIndex(): HelpSearchEntry[] {
  const titles = new Map(HELP_CATEGORIES.map((category) => [category.slug, category.title]));

  return ARTICLES.map((article) => ({
    ...toSummary(article),
    categoryTitle: titles.get(article.category) ?? '',
    headings: article.toc.map((entry) => entry.text).join(' · '),
    text: article.text
  }));
}
