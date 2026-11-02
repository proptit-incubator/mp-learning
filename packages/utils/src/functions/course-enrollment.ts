/** The `course.metadata` key holding the self-enrollment setting. */
export const SELF_ENROLLMENT_METADATA_KEY = 'allowSelfEnrollment';

/**
 * The key this setting used to live under. Still read as a fallback: there is no
 * backfill, so a course only gains the current key the first time its settings
 * are saved.
 */
export const LEGACY_SELF_ENROLLMENT_METADATA_KEY = 'allowNewStudent';

type SelfEnrollmentMetadata = {
  showInLibrary?: boolean | null;
  allowSelfEnrollment?: boolean | null;
  /** @deprecated Read-only legacy key. See {@link LEGACY_SELF_ENROLLMENT_METADATA_KEY}. */
  allowNewStudent?: boolean | null;
};

export function isSelfEnrollmentAllowed(metadata: SelfEnrollmentMetadata | null | undefined): boolean {
  return metadata?.allowSelfEnrollment ?? metadata?.allowNewStudent ?? true;
}

export function isCourseShownInLibrary(metadata: SelfEnrollmentMetadata | null | undefined): boolean {
  return isSelfEnrollmentAllowed(metadata);
}
