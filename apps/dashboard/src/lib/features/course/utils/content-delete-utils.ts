/** Whether a failed delete was refused because learners have submitted work for the content. */
export function isSubmittedWorkConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'CONFLICT';
}
