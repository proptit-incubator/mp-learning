import { describe, expect, it } from 'vitest';
import { chunk } from '../src/functions/array';

describe('chunk', () => {
  it('splits items into groups of the given size with a shorter last group', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no groups for no items', () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
