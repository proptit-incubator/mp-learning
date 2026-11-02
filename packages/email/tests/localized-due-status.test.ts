import { describe, expect, it } from 'vitest';

import { getLocalizedDueStatus } from '../src/core/student-email';

describe('getLocalizedDueStatus', () => {
  it('describes upcoming, same-day and overdue assignments in Vietnamese', () => {
    expect(getLocalizedDueStatus(7, 'vi')).toBe('Còn 7 ngày để hoàn thành.');
    expect(getLocalizedDueStatus(0, 'vi')).toBe('Đến hạn hôm nay.');
    expect(getLocalizedDueStatus(-1, 'vi')).toBe('Đã quá hạn hoàn thành.');
  });

  it('falls back to English for other locales', () => {
    expect(getLocalizedDueStatus(7, 'en')).toBe('7 days left to complete it.');
    expect(getLocalizedDueStatus(0, 'ru')).toBe('It is due today.');
    expect(getLocalizedDueStatus(-3, 'pl')).toBe('This course is overdue.');
  });
});
