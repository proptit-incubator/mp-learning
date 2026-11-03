import { afterEach, describe, expect, it, vi } from 'vitest';
const locale = vi.hoisted(() => ({ value: 'vi' }));

vi.mock('$lib/utils/functions/translations', () => ({
  locale: {
    subscribe: (run: (value: string) => void) => {
      run(locale.value);
      return () => {};
    }
  },
  supportedLocale: (value: string) => (value === 'en' ? 'en' : 'vi')
}));

import { calDateDiff } from './date';

const NOW = new Date('2026-11-04T12:00:00Z');

afterEach(() => {
  vi.useRealTimers();
});

describe('calDateDiff', () => {
  it('says how long ago in Vietnamese by default', () => {
    vi.useFakeTimers({ now: NOW });
    locale.value = 'vi';

    expect(calDateDiff('2026-10-29T12:00:00Z')).toBe('6 ngày trước');
    expect(calDateDiff('2026-11-04T09:00:00Z')).toBe('3 giờ trước');
  });

  it('follows the interface language', () => {
    vi.useFakeTimers({ now: NOW });
    locale.value = 'en';

    expect(calDateDiff('2026-10-29T12:00:00Z')).toBe('6 days ago');
  });
});
