import { resolveStudentEmailLocale, type EmailLocale } from '@cio/utils/email';

type LanguageSettings = { enforced?: boolean | null; locale?: unknown } | null | undefined;

/** The language employees receive emails in, so the template page edits the copy that is actually sent. */
export function getEmailTemplateLocale(language: LanguageSettings): EmailLocale {
  return resolveStudentEmailLocale({
    isEligible: true,
    enforced: language?.enforced === true,
    locale: language?.locale
  });
}
