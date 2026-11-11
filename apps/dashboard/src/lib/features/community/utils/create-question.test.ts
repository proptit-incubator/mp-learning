import { describe, expect, it } from 'vitest';
import { ZCreateCommunityQuestion } from '@cio/utils/validation/community';
import { mapZodErrorsToTranslations } from '$lib/utils/validation';

describe('asking a community question', () => {
  it('requires a course before sending, since every question belongs to one', () => {
    const missingCourse = ZCreateCommunityQuestion.safeParse({ title: 'Câu hỏi', body: 'Nội dung', courseId: '' });
    const withCourse = ZCreateCommunityQuestion.safeParse({ title: 'Câu hỏi', body: 'Nội dung', courseId: 'course-1' });

    expect(missingCourse.success).toBe(false);
    expect(withCourse.success).toBe(true);
  });

  it('reports the missing course on the course field', () => {
    const result = ZCreateCommunityQuestion.safeParse({ title: 'Câu hỏi', body: 'Nội dung', courseId: '' });

    expect(Object.keys(mapZodErrorsToTranslations(result.error!, 'community'))).toEqual(['courseId']);
  });
});
