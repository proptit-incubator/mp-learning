/** Absolute link employees open to reach a course; it needs a signed-in account with access to the course. */
export function getCourseShareUrl(courseId: string, origin: string): string {
  return new URL(`/courses/${courseId}/lessons`, origin).toString();
}
