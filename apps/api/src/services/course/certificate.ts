import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { getCourseById, getOrganizationById, getProfileById, getCourseOrganizationId } from '@cio/db/queries';
import { ensureLatestCycleCertificate, findCertificateByCode } from '@cio/db/queries/course/certificate-issue';
import { findEmployeeProfile } from '@cio/db/queries/organization';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { resolveCertificateDesign, type CertificateRenderInput } from '@api/utils/certificate';
import type { TCertificateDownloadRequest } from '@cio/utils/validation/course';

const CERTIFICATE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CERTIFICATE_CODE_LENGTH = 10;
const PREVIEW_CERTIFICATE_CODE = 'MAU0000000';
const BRAND_LOGO_URL = new URL('../../../static/brand/mp-transformation.png', import.meta.url);
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

let brandLogoDataUrl: Promise<string | null> | null = null;

function loadBrandLogo() {
  brandLogoDataUrl ??= readFile(BRAND_LOGO_URL)
    .then((file) => `data:image/png;base64,${file.toString('base64')}`)
    .catch((error) => {
      console.error('Failed to load the certificate brand logo:', error);
      return null;
    });
  return brandLogoDataUrl;
}

export function generateCertificateCode(): string {
  return Array.from(
    { length: CERTIFICATE_CODE_LENGTH },
    () => CERTIFICATE_CODE_ALPHABET[randomInt(CERTIFICATE_CODE_ALPHABET.length)]
  ).join('');
}

export function formatCertificateDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: VIETNAM_TIME_ZONE
  }).format(new Date(value));
}

export function formatCertificateId(format: string | undefined, code: string, issuedAt: Date): string {
  const [day, month, year] = formatCertificateDate(issuedAt.toISOString()).split('/');

  return (format ?? '{seq}')
    .replace('{seq}', code)
    .replace('{year}', year ?? '')
    .replace('{month}', month ?? '')
    .replace('{day}', day ?? '');
}

function certificateVerifyUrl(code: string) {
  return new URL(`/verify/${code}`, getDashboardBaseUrl()).href;
}

/** Issues (or returns) the certificate of the learner's latest completion cycle. Null without a completion cycle. */
export async function issueCourseCertificate(courseId: string, profileId: string, issuedAt: string) {
  const code = generateCertificateCode();
  return ensureLatestCycleCertificate(courseId, profileId, { code, issuedAt });
}

async function loadCertificateContext(courseId: string) {
  const [courseRow] = await getCourseById(courseId);
  if (!courseRow) {
    throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
  }

  const organizationId = await getCourseOrganizationId(courseId);
  const organization = organizationId ? await getOrganizationById(organizationId) : null;
  const brandLogo = await loadBrandLogo();
  const orgLogoUrl = brandLogo ?? organization?.avatarUrl ?? undefined;
  const design = resolveCertificateDesign(courseRow.certificate);

  return { courseRow, organizationId, organization, orgLogoUrl, design };
}

/**
 * Builds the certificate of `profileId` for `courseId` entirely from stored data: the employee's name and code, and
 * the issue date, expiry and verification code of the certificate of their latest completion cycle.
 * Throws 403 when the learner has no completion cycle.
 */
export async function assembleCertificateRender(courseId: string, profileId: string): Promise<CertificateRenderInput> {
  const { courseRow, organizationId, organization, orgLogoUrl, design } = await loadCertificateContext(courseId);
  const issue = await issueCourseCertificate(courseId, profileId, new Date().toISOString());
  if (!issue) {
    throw new AppError('Course completion requirements not met', ErrorCodes.VALIDATION_ERROR, 403);
  }

  const employee = organizationId ? await findEmployeeProfile(organizationId, profileId) : null;
  const profile = employee ? null : await getProfileById(profileId);
  const recipientName = employee?.fullname || profile?.fullname || '';

  return {
    design,
    data: {
      recipientName,
      employeeCode: employee?.employeeCode,
      courseName: courseRow.title,
      courseDescription: courseRow.description ?? '',
      orgName: organization?.name ?? '',
      orgLogoUrl,
      date: formatCertificateDate(issue.issuedAt),
      validUntil: issue.expiresAt ? formatCertificateDate(issue.expiresAt) : undefined,
      certificateId: formatCertificateId(design.idFormat, issue.code, new Date(issue.issuedAt)),
      verifyUrl: certificateVerifyUrl(issue.code)
    }
  };
}

/** Renders the course design for a course team member with a sample recipient; nothing is issued. */
export async function assembleOwnerPreviewRender(
  courseId: string,
  userId: string,
  body: TCertificateDownloadRequest
): Promise<CertificateRenderInput> {
  const { courseRow, organization, orgLogoUrl, design } = await loadCertificateContext(courseId);
  const recipientName = body.studentName?.trim() || (await getProfileById(userId))?.fullname || 'Nguyễn Văn A';
  const issuedAt = new Date().toISOString();

  return {
    design,
    data: {
      recipientName,
      courseName: courseRow.title,
      courseDescription: courseRow.description ?? '',
      orgName: organization?.name ?? '',
      orgLogoUrl,
      date: formatCertificateDate(issuedAt),
      validUntil: courseRow.recertificationMonths ? formatCertificateDate(issuedAt) : undefined,
      certificateId: formatCertificateId(design.idFormat, PREVIEW_CERTIFICATE_CODE, new Date(issuedAt)),
      verifyUrl: certificateVerifyUrl(PREVIEW_CERTIFICATE_CODE)
    }
  };
}

/** Public lookup of an issued certificate by its verification code. Throws 404 for unknown codes. */
export async function verifyCertificate(code: string) {
  const certificate = await findCertificateByCode(code.trim().toUpperCase());
  if (!certificate) throw new AppError('Certificate not found', ErrorCodes.NOT_FOUND, 404);

  const isExpired = certificate.expiresAt !== null && new Date(certificate.expiresAt) <= new Date();
  const state = certificate.status !== 'valid' ? 'revoked' : isExpired ? 'expired' : 'valid';

  return {
    code: certificate.code,
    state,
    recipientName: certificate.recipientName,
    employeeCode: certificate.employeeCode,
    courseTitle: certificate.courseTitle,
    organizationName: certificate.organizationName,
    issuedAt: certificate.issuedAt,
    expiresAt: certificate.expiresAt
  };
}
