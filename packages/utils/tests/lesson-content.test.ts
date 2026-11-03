import { describe, expect, it } from 'vitest';
import { hasLessonContent, pickLessonContent } from '../src/functions/lesson-content';

describe('pickLessonContent', () => {
  it('shows the learner language when it has content', () => {
    expect(pickLessonContent({ vi: '<p>Bài học</p>', en: '<p>Lesson</p>' }, 'en')).toBe('<p>Lesson</p>');
  });

  it('falls back to Vietnamese, then English, then any written translation', () => {
    expect(pickLessonContent({ vi: '<p>Bài học</p>', en: '<p>Lesson</p>' }, 'fr')).toBe('<p>Bài học</p>');
    expect(pickLessonContent({ en: '<p>Lesson</p>', fr: '<p></p>' }, 'fr')).toBe('<p>Lesson</p>');
    expect(pickLessonContent({ de: '<p>Lektion</p>' }, 'vi')).toBe('<p>Lektion</p>');
  });

  it('returns an empty note when no translation has content', () => {
    expect(pickLessonContent({ vi: '<p>&nbsp;</p>', en: null }, 'vi')).toBe('');
    expect(pickLessonContent(undefined, 'vi')).toBe('');
  });
});

describe('hasLessonContent', () => {
  it.each([
    ['<p><img src="a.png"></p>', true],
    ['<p> </p><p><br></p>', false],
    ['Văn bản', true]
  ])('treats %s as %s', (html, expected) => {
    expect(hasLessonContent(html)).toBe(expected);
  });
});
