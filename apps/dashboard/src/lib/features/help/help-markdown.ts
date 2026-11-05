import { Marked, Renderer } from 'marked';

export const HELP_BASE_PATH = '/help';

export interface HelpFrontmatter {
  title: string;
  description: string;
  order: number;
  audience: string;
}

export interface HelpTocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface RenderedHelpMarkdown {
  html: string;
  toc: HelpTocEntry[];
  text: string;
}

/** Lowercases and strips Vietnamese diacritics so "Khóa học" and "khoa hoc" compare equal. */
export function foldVietnamese(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/** URL-safe heading id, e.g. "Xác thực chữ ký" → "xac-thuc-chu-ky". */
export function slugifyHeading(value: string): string {
  return foldVietnamese(value)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

/** Splits a `---` frontmatter block of `key: value` lines from the Markdown body. */
export function parseHelpFrontmatter(source: string): { frontmatter: HelpFrontmatter; body: string } {
  const normalized = source.replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(normalized);
  const fields: Record<string, string> = {};

  if (match) {
    for (const line of match[1].split('\n')) {
      const separator = line.indexOf(':');
      if (separator === -1) continue;
      const key = line.slice(0, separator).trim();
      const value = line
        .slice(separator + 1)
        .trim()
        .replace(/^["'](.*)["']$/, '$1');
      if (key) fields[key] = value;
    }
  }

  const order = Number(fields.order);

  return {
    frontmatter: {
      title: fields.title ?? '',
      description: fields.description ?? '',
      order: Number.isFinite(order) ? order : 999,
      audience: fields.audience ?? ''
    },
    body: match ? normalized.slice(match[0].length) : normalized
  };
}

const CALLOUTS: Array<{ label: string; kind: string }> = [
  { label: 'Lưu ý:', kind: 'note' },
  { label: 'Mẹo:', kind: 'tip' },
  { label: 'Cảnh báo:', kind: 'warning' },
  { label: 'Quan trọng:', kind: 'warning' }
];

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function helpHref(href: string): string {
  if (href.startsWith('/docs/')) return `${HELP_BASE_PATH}/${href.slice('/docs/'.length)}`;
  if (href === '/docs') return HELP_BASE_PATH;
  return href;
}

/** Renders a help article to HTML, giving `##`/`###` headings stable ids and turning `> **Lưu ý:**` quotes into callouts. */
export function renderHelpMarkdown(markdown: string): RenderedHelpMarkdown {
  const toc: HelpTocEntry[] = [];
  const usedIds = new Map<string, number>();
  const renderer = new Renderer();

  renderer.heading = (text, level) => {
    const base = slugifyHeading(text) || 'muc';
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    const id = seen ? `${base}-${seen + 1}` : base;

    if (level === 2 || level === 3) toc.push({ id, text: stripTags(text), level });

    return `<h${level} id="${id}"><a class="help-anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${text}</h${level}>\n`;
  };

  renderer.blockquote = (quote) => {
    const callout = CALLOUTS.find(({ label }) => quote.includes(`<strong>${label}</strong>`));
    if (!callout) return `<blockquote>${quote}</blockquote>\n`;
    return `<div class="help-callout help-callout-${callout.kind}" role="note">${quote}</div>\n`;
  };

  renderer.link = (href, title, text) => {
    const target = helpHref(href ?? '');
    const external = /^https?:\/\//.test(target);
    const titleAttribute = title ? ` title="${title}"` : '';
    const externalAttributes = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${target}"${titleAttribute}${externalAttributes}>${text}</a>`;
  };

  renderer.table = (header, body) =>
    `<div class="help-table"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;

  const marked = new Marked({ renderer, gfm: true, mangle: false, headerIds: false });
  const html = marked.parse(markdown) as string;

  return { html, toc, text: stripTags(html.replace(/<a class="help-anchor"[^>]*>#<\/a>/g, '')) };
}
