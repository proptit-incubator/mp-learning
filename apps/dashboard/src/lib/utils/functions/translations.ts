import type { TLocale } from '@cio/db/types';
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
import { writable } from 'svelte/store';

/** MP Learning ships Vietnamese, the default, and English. Any other stored locale falls back to Vietnamese. */
export const SUPPORTED_LOCALES = ['vi', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function supportedLocale(value: string | null | undefined): SupportedLocale {
  return (value ?? '').split('-')[0] === 'en' ? 'en' : 'vi';
}

export const config = {
  parser: parser(),
  loaders: [
    {
      locale: 'vi',
      key: '',
      loader: async () => (await import('../translations/vi.json')).default
    },
    {
      locale: 'en',
      key: '',
      loader: async () => (await import('../translations/en.json')).default
    }
  ]
};

export const { t, loading, locales, locale, initialized, translations, loadTranslations } = new i18n(config);

export const selectedLocale = writable<string>('vi');
export const LOCALE_STORAGE_KEY = 'classroomio_locale';
export const LOCALE_COOKIE_KEY = 'classroomio_locale';

/*
  `@sveltekit-i18n/base` keeps its loading state in a process-global singleton: a
  single `currentRoute` writable that every request overwrites, and a shared
  `promises` Set that any request can `.clear()`. `loadTranslations` resolves by
  filtering that Set for its own `{ locale, route }` entry, so two concurrent SSR
  renders can leave one of them awaiting a promise the other already purged --
  the request then never settles and the browser gets no HTML at all.

  Dedupe by locale so concurrent renders await one shared promise instead of
  racing. Note the loaders below declare no `routes`, so every loader already
  runs for every route: there is nothing to load per-pathname, and passing one
  only widens the race to every first-time URL.
*/
const localeLoads = new Map<string, Promise<unknown>>();

/** Load a locale once per process, reusing the in-flight promise for callers that race. */
function primeLocale(targetLocale: string): Promise<unknown> {
  const inFlight = localeLoads.get(targetLocale);
  if (inFlight) return inFlight;

  const load = Promise.resolve(loadTranslations(targetLocale)).catch((error) => {
    // Drop the cached rejection so the next render can retry.
    localeLoads.delete(targetLocale);
    throw error;
  });

  localeLoads.set(targetLocale, load);

  return load;
}

/**
 * Load a locale's translations once per process, then activate it for this
 * render. Use this instead of calling `loadTranslations` directly.
 */
export async function ensureTranslations(
  targetLocale: string,
  shouldActivate: () => boolean = () => true
): Promise<void> {
  const resolvedLocale = supportedLocale(targetLocale);
  await primeLocale(resolvedLocale);

  // `locale.set` re-enters the library's loader trigger; `forceSet` just marks
  // the active locale for the strings we already hold.
  if (shouldActivate()) locale.forceSet(resolvedLocale);
}

export function handleLocaleChange(newLocale: TLocale | null | undefined) {
  const resolvedLocale = supportedLocale(newLocale);
  locale.set(resolvedLocale);
  selectedLocale.set(resolvedLocale);
  persistLocale(resolvedLocale);
}

export function activateLocale(newLocale: TLocale | null | undefined) {
  const resolvedLocale = supportedLocale(newLocale);
  locale.set(resolvedLocale);
  selectedLocale.set(resolvedLocale);
}

export function getPersistedLocale(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (savedLocale) {
      return savedLocale;
    }
  } catch (error) {
    console.warn('Failed to read saved locale from localStorage', error);
  }

  const cookieMatch = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`));
  return cookieMatch?.[1] ? decodeURIComponent(cookieMatch[1]) : null;
}

function persistLocale(newLocale: SupportedLocale) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  } catch (error) {
    console.warn('Failed to save locale to localStorage', error);
  }

  document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(newLocale)}; path=/; max-age=31536000; SameSite=Lax`;
}
