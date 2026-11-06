import { describe, expect, it } from 'vitest';

import { SentenceChunker } from './sentence-chunker';

describe('SentenceChunker', () => {
  it('emits each finished sentence as soon as the next word starts', () => {
    const chunker = new SentenceChunker();

    expect(chunker.push('Alo, chào cháu nhé. Cô đang')).toEqual(['Alo, chào cháu nhé.']);
    expect(chunker.push(' bấm vào ứng dụng mà không thấy gì cả! Cháu')).toEqual([
      'Cô đang bấm vào ứng dụng mà không thấy gì cả!'
    ]);
    expect(chunker.flush()).toBe('Cháu');
  });

  it('keeps very short sentences with the next one', () => {
    const chunker = new SentenceChunker();

    expect(chunker.push('Dạ. Vâng, cô hiểu rồi. ')).toEqual(['Dạ. Vâng, cô hiểu rồi.']);
  });

  it('does not cut decimals', () => {
    const chunker = new SentenceChunker();

    expect(chunker.push('Gói cước 3.5 GB mỗi ngày giá bao nhiêu')).toEqual([]);
    expect(chunker.flush()).toBe('Gói cước 3.5 GB mỗi ngày giá bao nhiêu');
  });

  it('cuts a long clause at its last comma', () => {
    const chunker = new SentenceChunker();
    const clause = `${'rất '.repeat(30)}lâu rồi, mà ${'vẫn '.repeat(15)}chưa`;

    const [first] = chunker.push(clause);

    expect(first).toMatch(/lâu rồi,$/);
  });
});
