import {
  DEFAULT_EMAIL_LOCALE,
  isEmailLocale,
  STUDENT_EMAIL_CATALOG,
  type EmailLocale,
  type StudentEmailId,
  type StudentEmailTemplateCopy
} from '@cio/utils/email';

import type { EmailBranding } from './branding';
import type { EmailRenderContext } from './types';
import { getDefaultTemplate } from '../templates';
import { escapeHtml, sanitizeEmailSubject } from '../utils/functions/email-helpers';

type TemplateValues = Record<string, unknown>;

interface StudentEmailRenderInput {
  id: StudentEmailId;
  values: TemplateValues;
  trustedHtml?: TemplateValues;
  optionalValues?: readonly string[];
  actionUrl?: string;
  ctaLabel?: string;
  branding?: EmailBranding;
  context?: EmailRenderContext;
}

function interpolate(template: string, values: TemplateValues, trustedHtml: TemplateValues = {}): string {
  return template.replace(/{{([a-z_]+)}}/g, (_, key: string) => {
    const trustedValue = trustedHtml[key];
    if (trustedValue != null) return String(trustedValue);

    const value = values[key];
    return value == null ? '' : escapeHtml(String(value));
  });
}

function omitParagraphsWithMissingValues(template: string, values: TemplateValues, optionalValues: readonly string[]) {
  return template.replace(/<p\b[^>]*>[\s\S]*?<\/p>/g, (paragraph) => {
    const hasMissingOptionalValue = optionalValues.some(
      (key) => (values[key] == null || values[key] === '') && paragraph.includes(`{{${key}}}`)
    );
    return hasMissingOptionalValue ? '' : paragraph;
  });
}

function replaceActionLinks(content: string, actionUrl?: string): string {
  const actionHref = /href\s*=\s*(['"]){{\s*action_url\s*}}\1/gi;
  if (!actionUrl) return content.replace(actionHref, '');

  return content.replace(actionHref, `href="${escapeHtml(actionUrl)}"`);
}

export function getStudentEmailCopy(
  id: StudentEmailId,
  context: EmailRenderContext = {}
): { locale: EmailLocale; copy: StudentEmailTemplateCopy } {
  const locale = isEmailLocale(context.locale) ? context.locale : DEFAULT_EMAIL_LOCALE;
  return { locale, copy: STUDENT_EMAIL_CATALOG[locale].templates[id] };
}

export function renderStudentEmailSubject(
  id: StudentEmailId,
  values: TemplateValues,
  context: EmailRenderContext = {}
): string {
  const { copy } = getStudentEmailCopy(id, context);
  const subject = context.subjectOverride ?? copy.subject;
  return sanitizeEmailSubject(
    subject.replace(/{{([a-z_]+)}}/g, (_, key: string) => {
      const value = values[key];
      return value == null ? '' : String(value);
    })
  );
}

export function renderStudentEmail(input: StudentEmailRenderInput): string {
  const context = input.context ?? {};
  const { locale, copy } = getStudentEmailCopy(input.id, context);
  const bodyTemplate = omitParagraphsWithMissingValues(
    context.contentOverride ?? copy.body,
    input.values,
    input.optionalValues ?? []
  );
  const bodyWithActionLinks = replaceActionLinks(bodyTemplate, input.actionUrl);
  const body = interpolate(bodyWithActionLinks, input.values, input.trustedHtml);
  const ctaLabel = input.ctaLabel ?? copy.cta;
  const cta =
    ctaLabel && input.actionUrl
      ? `<div><a class="button" href="${escapeHtml(input.actionUrl)}">${escapeHtml(ctaLabel)}</a></div>`
      : '';

  return getDefaultTemplate(`${body}${cta}`, input.branding, locale, STUDENT_EMAIL_CATALOG[locale].footer);
}

type DueStatusCopy = { overdue: string; dueToday: string; due: (days: number) => string };

const DUE_STATUS_EN: DueStatusCopy = {
  overdue: 'This course is overdue.',
  dueToday: 'It is due today.',
  due: (days) => `${days} days left to complete it.`
};

const DUE_STATUS: Partial<Record<EmailLocale, DueStatusCopy>> = {
  vi: {
    overdue: 'Đã quá hạn hoàn thành.',
    dueToday: 'Đến hạn hôm nay.',
    due: (days) => `Còn ${days} ngày để hoàn thành.`
  }
};

export function getLocalizedDueStatus(daysUntilDue: number, locale: EmailLocale): string {
  const copy = DUE_STATUS[locale] ?? DUE_STATUS_EN;
  if (daysUntilDue < 0) return copy.overdue;
  if (daysUntilDue === 0) return copy.dueToday;

  return copy.due(daysUntilDue);
}
