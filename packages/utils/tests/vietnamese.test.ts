import { describe, expect, it } from 'vitest';
import { foldVietnamese, VIETNAMESE_ACCENTED, VIETNAMESE_PLAIN } from '../src/functions/vietnamese';

describe('foldVietnamese', () => {
  it('strips tones and letter marks, including đ', () => {
    expect(foldVietnamese('Nguyễn Văn Đức')).toBe('nguyen van duc');
    expect(foldVietnamese('KẾ TOÁN Ưu Tiên')).toBe('ke toan uu tien');
  });

  it('handles decomposed input', () => {
    expect(foldVietnamese('Hằng'.normalize('NFD'))).toBe('hang');
  });

  it('keeps the two translate strings aligned', () => {
    expect([...VIETNAMESE_ACCENTED]).toHaveLength([...VIETNAMESE_PLAIN].length);
  });
});
