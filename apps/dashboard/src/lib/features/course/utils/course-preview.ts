import { get } from 'svelte/store';
import { resolve } from '$app/paths';
import { snackbar } from '$features/ui/snackbar/store';
import { accountApi } from '$features/account/api/account.svelte';
import { currentOrg, getOrgPublicOrigin } from '$lib/utils/store/org';
import { getCourseShareUrl } from './course-share-url';

interface ViewAsStudentOptions {
  courseId?: string | null;
  currentOrgDomain?: string;
}

/** Opens the course as learners see it in a new tab. Client-only. */
export function openCoursePreview({ courseId }: { courseId: string }) {
  if (!courseId || typeof window === 'undefined') return false;

  window.open(resolve(`/courses/${courseId}/lessons`, {}), '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * "View as student" handoff. Mints a short-lived login-link token for the current
 * user and navigates to the org domain's `/api/auth/login-link`, which signs them in
 * there (host-only session) and redirects to the course's student view.
 *
 * One flow for cloud and self-hosted: on cloud the tenant-router worker fronts
 * `/api/auth/*`→API and `/course/*`→dashboard under the tenant host; on self-hosted the
 * dashboard's own `hooks.server.ts` proxies `/api/auth/*` to the API. Either way the
 * cookie lands on `currentOrgDomain` and the relative `redirect` resolves there.
 */
export async function viewAsStudent({ courseId, currentOrgDomain = '' }: ViewAsStudentOptions) {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!courseId) {
    return false;
  }

  const token = await accountApi.createViewAsStudentToken();
  if (!token) {
    snackbar.error('snackbar.view_as_student.failed');

    return false;
  }

  const origin = currentOrgDomain?.trim() || getOrgPublicOrigin(get(currentOrg));
  const loginLinkUrl = new URL('/api/auth/login-link', origin);
  loginLinkUrl.searchParams.set('token', token);
  loginLinkUrl.searchParams.set('redirect', `/courses/${courseId}/lessons?next=true`);

  // Cross-origin handoff — open in a new tab so the teacher keeps their dashboard.
  window.open(loginLinkUrl.toString(), '_blank', 'noopener,noreferrer');

  return true;
}

export async function copyCourseShareUrl(courseId: string) {
  if (typeof window === 'undefined') {
    return false;
  }

  const url = getCourseShareUrl(courseId, window.location.origin);

  try {
    await navigator.clipboard.writeText(url);
    snackbar.success('snackbar.public_course.url_copied');

    return true;
  } catch (error) {
    console.error('copyCourseShareUrl error:', error);
    snackbar.error('snackbar.public_course.url_copy_failed');

    return false;
  }
}
