import type { SupportedLocale } from '$lib/utils/functions/translations';

export const LANGUAGE: Record<SupportedLocale, string> = {
  vi: 'Tiếng Việt',
  en: 'English'
};

export const LANGUAGES = Object.entries(LANGUAGE).map(([id, text]) => ({ id, text }));
