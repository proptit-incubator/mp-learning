import { ensureTranslations, getPersistedLocale, supportedLocale } from '$lib/utils/functions/translations';

export const load = async ({ data }) => {
  const persistedLocale = data?.localeCookie || getPersistedLocale();

  const enforcedOrgLocale =
    data?.isOrgSite && data?.org?.settings?.language?.enforced ? data.org.settings.language.locale : undefined;
  const defaultOrgLocale = data?.isOrgSite ? data?.org?.settings?.language?.locale : undefined;
  const userLocale = enforcedOrgLocale || persistedLocale || data?.locals?.profile?.locale || defaultOrgLocale || 'vi';

  const initLocale = supportedLocale(userLocale);
  const translationsStart = performance.now();
  await ensureTranslations(initLocale); // keep this just before the `return`
  const translationsMs = Math.round((performance.now() - translationsStart) * 100) / 100;
  console.log(`[+layout.ts] ensureTranslations: ${translationsMs}ms | locale=${initLocale}`);

  return data ?? {};
};
