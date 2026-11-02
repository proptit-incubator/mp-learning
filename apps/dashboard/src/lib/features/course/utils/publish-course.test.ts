import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from './types';

const mocks = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('$features/course/api', () => ({ courseApi: { update: mocks.update, errors: {} } }));
vi.mock('$features/ui/snackbar/store', () => ({ snackbar: { error: vi.fn() } }));

import { publishCourse } from './publish-course';

describe('publishing preserves internal access policy', () => {
  beforeEach(() => {
    mocks.update.mockReset();
    mocks.update.mockResolvedValue({ success: true });
  });

  it.each([
    { showInLibrary: false, allowSelfEnrollment: false },
    { showInLibrary: true, allowSelfEnrollment: false },
    { showInLibrary: true, allowSelfEnrollment: true }
  ])('does not change discovery or enrollment permissions: %j', async (metadata) => {
    const course = {
      id: 'course-id',
      title: 'Internal course',
      slug: 'internal-course',
      cost: 0,
      metadata
    } as Course;
    expect(await publishCourse(course)).toEqual({ ok: true });
    const update = mocks.update.mock.calls[0][1];
    const savedMetadata = { ...course.metadata, ...update.metadata };
    expect(update.isPublished).toBe(true);
    expect(savedMetadata.showInLibrary).toBe(metadata.showInLibrary);
    expect(savedMetadata.allowSelfEnrollment).toBe(metadata.allowSelfEnrollment);
  });
});
