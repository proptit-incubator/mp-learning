import { describe, expect, it } from 'vitest';

import { slugifyTitle } from '../src/validation/shared/slug';
import { generateSlug } from '../src/functions/slug';

describe('Vietnamese titles', () => {
  it('keeps the letters of accented words in course slugs', () => {
    expect(generateSlug('Kiểm thử bản sao Đào tạo 2036')).toBe('kiem-thu-ban-sao-dao-tao-2036');
  });

  it('keeps the letters of accented words in lesson slugs', () => {
    expect(slugifyTitle('Đường đi ổn định')).toBe('duong-di-on-dinh');
  });
});
