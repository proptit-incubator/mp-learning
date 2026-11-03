const MEDIA_TAG = /<(img|svg|iframe|video|audio|embed|object)\b/i;

/** Lesson notes are written once in Vietnamese; English is the upstream default for older content. */
export const LESSON_CONTENT_FALLBACK_LOCALES = ['vi', 'en'] as const;

/** Whether a lesson note has text or media a learner can see, ignoring empty editor markup such as `<p></p>`. */
export function hasLessonContent(html: string | null | undefined): html is string {
  if (!html) return false;
  if (MEDIA_TAG.test(html)) return true;

  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, '')
      .trim().length > 0
  );
}

/**
 * The lesson note to show for `locale`: that translation when it has content, else Vietnamese, English, then any
 * translation with content. Learners never see an empty lesson because they picked another language.
 */
export function pickLessonContent(
  contentByLocale: Partial<Record<string, string | null>> | null | undefined,
  locale: string
): string {
  const translations = contentByLocale ?? {};
  for (const candidate of [locale, ...LESSON_CONTENT_FALLBACK_LOCALES]) {
    const content = translations[candidate];
    if (hasLessonContent(content)) return content;
  }

  return Object.values(translations).find(hasLessonContent) ?? '';
}
