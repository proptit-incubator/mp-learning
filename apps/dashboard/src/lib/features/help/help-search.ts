import { foldVietnamese } from './help-markdown';

export interface HelpSearchable {
  title: string;
  description: string;
  headings: string;
  text: string;
}

export interface HelpSearchResult<T extends HelpSearchable> {
  entry: T;
  snippet: string;
}

const SNIPPET_RADIUS = 90;

function snippetAround(text: string, foldedText: string, term: string): string {
  const position = foldedText.indexOf(term);
  if (position === -1) return text.slice(0, SNIPPET_RADIUS * 2).trim() + (text.length > SNIPPET_RADIUS * 2 ? '…' : '');

  const start = Math.max(0, position - SNIPPET_RADIUS);
  const end = Math.min(text.length, position + term.length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/**
 * Ranks entries that contain every word of `query`, ignoring case and Vietnamese accents.
 * Title matches outrank heading matches, which outrank description and body matches.
 */
export function searchHelp<T extends HelpSearchable>(entries: T[], query: string, limit = 20): HelpSearchResult<T>[] {
  const terms = foldVietnamese(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const scored: Array<HelpSearchResult<T> & { score: number }> = [];

  for (const entry of entries) {
    const title = foldVietnamese(entry.title);
    const headings = foldVietnamese(entry.headings);
    const description = foldVietnamese(entry.description);
    const text = foldVietnamese(entry.text);

    let score = 0;
    let matchesAll = true;

    for (const term of terms) {
      const termScore =
        (title.includes(term) ? 10 : 0) +
        (headings.includes(term) ? 4 : 0) +
        (description.includes(term) ? 3 : 0) +
        (text.includes(term) ? 1 : 0);
      if (!termScore) {
        matchesAll = false;
        break;
      }
      score += termScore;
    }

    if (!matchesAll) continue;
    if (title.includes(terms.join(' '))) score += 15;

    scored.push({ entry, score, snippet: snippetAround(entry.text, text, terms[0]) });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry, snippet }) => ({ entry, snippet }));
}
