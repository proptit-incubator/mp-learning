import { describe, expect, it } from 'vitest';
import { getEmailTemplateLocale } from './email-template-locale';

describe('getEmailTemplateLocale', () => {
  it('edits the Vietnamese copy when no language is enforced, as delivery sends Vietnamese', () => {
    expect(getEmailTemplateLocale(undefined)).toBe('vi');
    expect(getEmailTemplateLocale({ enforced: false, locale: 'en' })).toBe('vi');
  });

  it('follows an enforced email language', () => {
    expect(getEmailTemplateLocale({ enforced: true, locale: 'en' })).toBe('en');
    expect(getEmailTemplateLocale({ enforced: true, locale: 'fr' })).toBe('vi');
  });
});
