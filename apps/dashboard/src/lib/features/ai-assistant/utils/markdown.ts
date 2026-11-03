import { marked } from 'marked';
import { sanitizeHtml } from '@cio/ui/tools/sanitize';
import { renderMentions } from './mentions';

// Configure marked for safe, minimal output
marked.setOptions({
  breaks: true,
  gfm: true
});

/** Convert markdown text to HTML. The result is not sanitized; render it through `renderChatMessage`. */
export function renderMarkdown(text: string): string {
  if (!text) return '';

  return marked.parse(text, { async: false }) as string;
}

/**
 * Model output is untrusted: a prompt-injected lesson or document can make the model emit script or event
 * handlers. Mentions become in-app links first, then DOMPurify strips anything unsafe.
 */
export function renderChatMessage(text: string, courseId: string): string {
  return sanitizeHtml(renderMentions(renderMarkdown(text), courseId), { allowAttributes: ['data-mention-route'] });
}
