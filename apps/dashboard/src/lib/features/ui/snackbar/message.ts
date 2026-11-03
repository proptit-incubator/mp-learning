import { SNACKBAR_SEVERITY } from './constants';

const FALLBACK_KEYS: Record<string, string> = {
  [SNACKBAR_SEVERITY.ERROR]: 'snackbar.something',
  [SNACKBAR_SEVERITY.SUCCESS]: 'snackbar.success'
};

/**
 * The text a toast shows. Callers pass translation keys, but many API helpers hand over the server's English error
 * text or a key that was never added. In Vietnamese those would show as English or as a raw key, so they become the
 * generic message for the severity. Text that already has a translation, or contains Vietnamese, shows unchanged.
 */
export function resolveSnackbarMessage(input: {
  message: string;
  translated: string;
  locale: string;
  severity: string;
  translate: (key: string) => string;
}): string {
  const { message, translated, locale, severity, translate } = input;
  const untranslated = translated === message;
  const asciiOnly = !/[^\x20-\x7E]/.test(message);
  const fallback = FALLBACK_KEYS[severity];
  if (!untranslated || !asciiOnly || locale === 'en' || !fallback) return translated;

  return translate(fallback);
}
