import { describe, expect, it } from 'vitest';
import { isCourseShownInLibrary, isSelfEnrollmentAllowed } from '@cio/utils/functions/course-enrollment';
import { ZInternalCourseEnrollBody } from '@cio/utils/validation/course';

describe('internal course library policy', () => {
  it.each([
    [undefined, true],
    [{}, true],
    [{ allowNewStudent: false }, false],
    [{ allowSelfEnrollment: true, allowNewStudent: false }, true],
    [{ showInLibrary: true, allowSelfEnrollment: false }, false],
    [{ showInLibrary: false, allowSelfEnrollment: true }, true]
  ])('resolves legacy and explicit visibility: %j', (metadata, expected) => {
    expect(isCourseShownInLibrary(metadata)).toBe(expected);
  });

  it('decides self-enrollment from the course setting alone', () => {
    expect(isSelfEnrollmentAllowed({ allowSelfEnrollment: false })).toBe(false);
    expect(isSelfEnrollmentAllowed({ allowSelfEnrollment: true })).toBe(true);
    expect(isSelfEnrollmentAllowed({ allowNewStudent: false })).toBe(false);
  });

  it('accepts an empty enrollment body and rejects legacy invitations and extra fields', () => {
    expect(ZInternalCourseEnrollBody.safeParse({}).success).toBe(true);
    expect(ZInternalCourseEnrollBody.safeParse({ inviteToken: 'old-token' }).success).toBe(false);
    expect(ZInternalCourseEnrollBody.safeParse({ organizationId: 'other-org' }).success).toBe(false);
  });
});
