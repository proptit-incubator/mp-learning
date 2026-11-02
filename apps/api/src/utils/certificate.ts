import {
  CERTIFICATE_PDF_PAGE_OPTIONS,
  CERTIFICATE_VIEWPORT,
  renderCertificate,
  resolveCertificateDesign,
  type CertificateDesign,
  type CertificateRenderData
} from '@cio/certificates';

import { renderHtmlToPdf, renderHtmlToPng } from '@api/utils/browser-render';

export { resolveCertificateDesign };

export interface CertificateRenderInput {
  design: CertificateDesign;
  data: CertificateRenderData;
}

export async function generateCertificatePdf(input: CertificateRenderInput) {
  const { html, styles } = renderCertificate(input.design, input.data);

  return renderHtmlToPdf(html, styles, CERTIFICATE_VIEWPORT, CERTIFICATE_PDF_PAGE_OPTIONS);
}

export async function generateCertificatePng(input: CertificateRenderInput) {
  const { html, styles } = renderCertificate(input.design, input.data);

  return renderHtmlToPng(html, styles, { ...CERTIFICATE_VIEWPORT, deviceScaleFactor: 2 });
}

export function slugifyForFilename(value: string): string {
  return (
    value
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'certificate'
  );
}
