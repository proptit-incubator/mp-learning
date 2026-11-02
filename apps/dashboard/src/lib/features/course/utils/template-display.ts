import type { CourseTemplatePreview } from './types';

export function formatTemplateUsedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

export function templateCardSubtitle(lastUsedAt: string | null | undefined, owned: boolean, translate: Translate) {
  if (!owned) return translate('course_templates.card.curated');
  if (!lastUsedAt) return translate('course_templates.card.yours');

  const date = formatTemplateUsedDate(lastUsedAt);
  if (!date) return translate('course_templates.card.yours');

  return translate('course_templates.card.used', { date });
}

export function templatePreviewSettingRows(settings: CourseTemplatePreview['settings'], translate: Translate) {
  const rows: { key: string; label: string }[] = [];

  if (settings.certificate) {
    rows.push({ key: 'certificate', label: translate('course_templates.preview.certificate') });
  }

  if (settings.sequential) {
    rows.push({ key: 'sequential', label: translate('course_templates.preview.sequential') });
  }

  if (settings.grading) {
    rows.push({ key: 'grading', label: translate('course_templates.preview.grading') });
  }

  if (settings.commentsOff) {
    rows.push({ key: 'commentsOff', label: translate('course_templates.preview.comments_off') });
  }

  if (settings.lessonDownload) {
    rows.push({ key: 'lessonDownload', label: translate('course_templates.preview.lesson_download') });
  }

  if (settings.selfEnrollment) {
    rows.push({ key: 'selfEnrollment', label: translate('course_templates.preview.self_enrollment') });
  }

  if (settings.aiTutor) {
    rows.push({ key: 'aiTutor', label: translate('course_templates.preview.ai_tutor') });
  }

  return rows;
}

export type TemplateSettingDisplay = { kind: 'image'; url: string } | { kind: 'text'; text: string };

const IMAGE_SETTING_KEYS = new Set(['bannerImage']);
const RICH_TEXT_SETTING_KEYS = new Set(['welcomeEmail', 'landingRequirements', 'landingDescription', 'landingGoals']);
const SETTING_TEXT_MAX_LENGTH = 80;

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string) {
  if (text.length <= SETTING_TEXT_MAX_LENGTH) return text;

  return `${text.slice(0, SETTING_TEXT_MAX_LENGTH).trimEnd()}…`;
}

function formatPrice(pricing: Record<string, unknown>, translate: Translate) {
  const cost = typeof pricing.cost === 'number' ? pricing.cost : 0;
  if (cost <= 0) return translate('course_templates.sync.value.no_price');

  const currency = typeof pricing.currency === 'string' && pricing.currency ? pricing.currency : 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cost);
  } catch {
    return `${cost} ${currency}`;
  }
}

function formatDeadline(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turns a synced setting value into what the review sheet shows: an image for
 * image settings, otherwise short readable text. Never returns raw HTML or JSON.
 */
export function templateSettingDisplay(key: string, value: unknown, translate: Translate): TemplateSettingDisplay {
  const empty = { kind: 'text' as const, text: translate('course_templates.sync.empty_value') };
  if (value == null || value === '') return empty;

  if (IMAGE_SETTING_KEYS.has(key) && typeof value === 'string') return { kind: 'image', url: value };

  if (typeof value === 'boolean') {
    const text = value ? translate('course_templates.sync.yes') : translate('course_templates.sync.no');
    return { kind: 'text', text };
  }

  if (key === 'progression' && (value === 'free' || value === 'sequential')) {
    return { kind: 'text', text: translate(`course_templates.sync.value.${value}`) };
  }

  if (key === 'completionDeadline' && typeof value === 'string') {
    return { kind: 'text', text: formatDeadline(value) };
  }

  if (key === 'pricing' && isRecord(value)) {
    return { kind: 'text', text: formatPrice(value, translate) };
  }

  if (key === 'landingInstructor' && isRecord(value)) {
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    return name ? { kind: 'text', text: truncate(name) } : empty;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value.length > 0 ? { kind: 'text', text: truncate(value.join(', ')) } : empty;
  }

  if (typeof value === 'string') {
    const text = RICH_TEXT_SETTING_KEYS.has(key) || key === 'description' ? plainText(value) : value;
    return text ? { kind: 'text', text: truncate(text) } : empty;
  }

  if (typeof value === 'number') return { kind: 'text', text: String(value) };

  return { kind: 'text', text: translate('course_templates.sync.custom_value') };
}
