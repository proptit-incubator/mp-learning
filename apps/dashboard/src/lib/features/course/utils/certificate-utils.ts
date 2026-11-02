import { resolveTemplateId, type CertificateRenderData } from '@cio/certificates';
import { DEFAULT_CERTIFICATE_THEME_ID, type CertificateThemeId } from './constants';
import { t } from '$lib/utils/functions/translations';

/**
 * Resolves a stored theme/template id. Maps legacy 6-theme ids onto the new
 * 5 Atelier templates via `LEGACY_THEME_MAP`; unknown values fall back to
 * `DEFAULT_CERTIFICATE_THEME_ID`.
 */
export function parseCertificateThemeId(raw: string | null | undefined): CertificateThemeId {
  if (raw == null || raw === '') return DEFAULT_CERTIFICATE_THEME_ID;

  return resolveTemplateId(raw);
}

export type BlockerData = {
  code: string;
  params?: Record<string, string | number>;
};

export function formatBlockerMessage(blocker: BlockerData): string {
  const p = blocker.params ?? {};
  switch (blocker.code) {
    case 'CERT_PROGRESS':
      return t.get('course.certification.blocker_progress', {
        current: Number(p.current ?? 0),
        required: Number(p.required ?? 0)
      });
    case 'CERT_DEADLINE_PASSED':
      return t.get('course.certification.blocker_deadline');
    case 'CERT_NO_CONTENT':
      return t.get('course.certification.blocker_no_content');
    default:
      return blocker.code;
  }
}

const PREVIEW_CERTIFICATE_CODE = 'MAU0000000';
const BRAND_LOGO_PATH = '/brand/mp-transformation.png';

/** Sample render data for certificate previews, matching what the server prints on an issued certificate. */
export function buildCertificatePreviewData(input: {
  recipientName: string;
  courseName: string;
  courseDescription: string;
  orgName: string;
  idFormat: string | undefined;
  hasRecertification: boolean;
  origin: string;
}): CertificateRenderData {
  const today = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Ho_Chi_Minh'
  }).format(new Date());

  return {
    recipientName: input.recipientName,
    courseName: input.courseName,
    courseDescription: input.courseDescription,
    orgName: input.orgName,
    orgLogoUrl: `${input.origin}${BRAND_LOGO_PATH}`,
    date: today,
    validUntil: input.hasRecertification ? today : undefined,
    certificateId: (input.idFormat || '{seq}').replace('{seq}', PREVIEW_CERTIFICATE_CODE),
    verifyUrl: `${input.origin}/verify/${PREVIEW_CERTIFICATE_CODE}`
  };
}
