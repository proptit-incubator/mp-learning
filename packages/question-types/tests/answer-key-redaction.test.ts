import { describe, expect, it } from 'vitest';
import { redactAnswerKey } from '../src/answer-key-redaction';

const alwaysFirst = () => 0;

describe('redactAnswerKey', () => {
  it('clears correct-option flags without touching the stored question', () => {
    const question = {
      title: 'Pick one',
      settings: {},
      options: [
        { id: 1, label: 'A', isCorrect: true },
        { id: 2, label: 'B', isCorrect: false }
      ]
    };

    const redacted = redactAnswerKey(question);

    expect(redacted.options.map((option) => option.isCorrect)).toEqual([false, false]);
    expect(question.options[0]?.isCorrect).toBe(true);
  });

  it.each([
    ['true/false and star', { correctValue: true }],
    ['numeric', { correctValue: 42, tolerance: 1 }],
    ['fill in the blank', { acceptedAnswers: 'Hà Nội|Ha Noi' }],
    ['matching', { pairs: [{ left: 'a', right: 'b' }] }],
    ['hotspot', { hotspots: [{ x: 1, y: 2, radius: 3 }], imageUrl: 'https://img' }]
  ])('removes the answer key of %s questions', (_label, settings) => {
    const redacted = redactAnswerKey({ settings, options: [] });

    expect(redacted.settings).not.toHaveProperty('correctValue');
    expect(redacted.settings).not.toHaveProperty('acceptedAnswers');
    expect(redacted.settings).not.toHaveProperty('pairs');
    expect(redacted.settings).not.toHaveProperty('hotspots');
  });

  it('keeps display settings such as tolerance, template and image', () => {
    const redacted = redactAnswerKey({
      settings: { tolerance: 1, template: 'A ___ B', imageUrl: 'https://img', maxStars: 5 },
      options: []
    });

    expect(redacted.settings).toEqual({ tolerance: 1, template: 'A ___ B', imageUrl: 'https://img', maxStars: 5 });
  });

  it('mixes word-bank answers into the distractors so blanks cannot be read off', () => {
    const redacted = redactAnswerKey({
      settings: { template: '___ là thủ đô của ___', correctAnswers: ['Hà Nội', 'Việt Nam'], distractors: ['Huế'] },
      options: []
    });

    expect(redacted.settings?.correctAnswers).toEqual([]);
    expect([...(redacted.settings?.distractors as string[])].sort()).toEqual(['Huế', 'Hà Nội', 'Việt Nam'].sort());
  });

  it('shuffles ordering items and options away from the stored correct order', () => {
    const items = ['first', 'second', 'third'];
    const redacted = redactAnswerKey(
      {
        settings: { items },
        options: items.map((label, index) => ({ id: index, label, isCorrect: false }))
      },
      alwaysFirst
    );

    expect(redacted.settings?.items).not.toEqual(items);
    expect(redacted.options?.map((option) => option.label)).not.toEqual(items);
    expect([...(redacted.settings?.items as string[])].sort()).toEqual([...items].sort());
  });
});
