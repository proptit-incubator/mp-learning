import { CERTIFICATE_LABELS, CERTIFICATE_WIDTH } from '../constants';
import { CERTIFICATE_FONTS } from '../font-metrics';
import { escapeHtml, prepareCertificateRenderContext, renderSignatoryBlock, type TemplateRenderer } from './shared';

const FONTS = {
  sans: CERTIFICATE_FONTS.beVietnamPro,
  mono: CERTIFICATE_FONTS.jetbrainsMono
} as const;

const BRAND = {
  navy: '#0e2259',
  blue: '#1559c6',
  cyan: '#0ea5e0',
  sky: '#6cc9f2',
  ink: '#1f2a44',
  muted: '#5b6785',
  hairline: '#dfe6f3'
} as const;

const certPaddingLeft = 76;
const certPaddingRight = 76;
const certPaddingTop = 56;
const certPaddingBottom = 54;
const bottomBarHeight = 10;
const facetWidth = 330;
const facetHeight = 290;
const facetClearance = 24;
const logoHeight = 46;
const contentWidth = CERTIFICATE_WIDTH - certPaddingLeft - certPaddingRight;
const headingWidth = contentWidth - facetWidth + certPaddingRight - facetClearance;
const footerGap = 36;
const metaColumnWidth = 300;
const signatoryColumnWidth = (contentWidth - metaColumnWidth - footerGap * 2) / 2;
const signatoryLineGap = 8;

const FIELDS = {
  subtitle: {
    maxWidth: headingWidth,
    maxHeight: 88,
    fontFamily: FONTS.sans,
    basePx: 34,
    lineHeight: 1.22,
    fontWeight: 700 as const,
    allowWrap: true
  },
  recipient: {
    maxWidth: contentWidth,
    maxHeight: 84,
    fontFamily: FONTS.sans,
    basePx: 54,
    lineHeight: 1.45,
    letterSpacingEm: 0.01,
    fontWeight: 800 as const,
    allowWrap: false,
    textTransform: 'uppercase' as const
  },
  course: {
    maxWidth: contentWidth,
    maxHeight: 72,
    fontFamily: FONTS.sans,
    basePx: 27,
    lineHeight: 1.3,
    fontWeight: 700 as const,
    allowWrap: true
  },
  description: {
    maxWidth: contentWidth - facetClearance * 4,
    maxHeight: 42,
    fontFamily: FONTS.sans,
    basePx: 14,
    lineHeight: 1.5,
    allowWrap: true
  },
  footerValue: {
    maxWidth: metaColumnWidth / 2,
    maxHeight: 20,
    fontFamily: FONTS.sans,
    basePx: 15,
    lineHeight: 1.25,
    fontWeight: 600 as const,
    allowWrap: false
  },
  certId: {
    maxWidth: metaColumnWidth,
    maxHeight: 20,
    fontFamily: FONTS.mono,
    basePx: 15,
    lineHeight: 1.25,
    letterSpacingEm: 0.08,
    allowWrap: false
  },
  signatoryName: {
    maxWidth: signatoryColumnWidth,
    maxHeight: 22,
    fontFamily: FONTS.sans,
    basePx: 16,
    lineHeight: 1.3,
    fontWeight: 700 as const,
    allowWrap: false
  },
  signatoryRole: {
    maxWidth: signatoryColumnWidth,
    maxHeight: 34,
    fontFamily: FONTS.sans,
    basePx: 12,
    lineHeight: 1.35,
    allowWrap: true
  }
} as const;

/** Corner ribbons: parallel bands that each run from the top edge to the right edge of the facet box. */
const FACET_SLOPE = facetHeight / 270;
const FACET_BANDS = [
  { from: 0, to: 96, color: BRAND.navy },
  { from: 96, to: 176, color: BRAND.blue },
  { from: 176, to: 236, color: BRAND.cyan },
  { from: 236, to: 270, color: BRAND.sky }
] as const;

function facetBand(from: number, to: number): string {
  const top = (offset: number) => `${facetWidth - offset},0`;
  const side = (offset: number) => `${facetWidth},${Math.round(offset * FACET_SLOPE)}`;
  return from === 0 ? `${facetWidth},0 ${top(to)} ${side(to)}` : `${top(from)} ${top(to)} ${side(to)} ${side(from)}`;
}

function renderFacets(): string {
  return `
    <svg class="facets" viewBox="0 0 ${facetWidth} ${facetHeight}" aria-hidden="true">
      ${FACET_BANDS.map((band) => `<polygon points="${facetBand(band.from, band.to)}" fill="${band.color}" />`).join('')}
      <polygon points="${facetBand(96, 120)}" fill="${BRAND.navy}" opacity="0.35" />
    </svg>
  `;
}

function renderMetaRow(label: string, value: string, valueClass: string, fontSize: number): string {
  return `
    <div class="meta-row">
      <span class="meta-label">${escapeHtml(label)}</span>
      <span class="${valueClass}" style="font-size: ${fontSize}px;">${escapeHtml(value)}</span>
    </div>
  `;
}

export const renderMp: TemplateRenderer = ({ design, data }) => {
  const { accent, subtitle, description, signatoryOne, signatoryTwo, fontSizes } = prepareCertificateRenderContext(
    design,
    data,
    FIELDS
  );
  const logo = data.orgLogoUrl
    ? `<img class="logo" src="${escapeHtml(data.orgLogoUrl)}" alt="${escapeHtml(data.orgName)}" />`
    : `<div class="logo-text">${escapeHtml(data.orgName)}</div>`;
  const employeeCode = data.employeeCode
    ? `<span class="employee-code">${escapeHtml(CERTIFICATE_LABELS.employeeCode)}: ${escapeHtml(data.employeeCode)}</span>`
    : '';
  const validUntilRow = data.validUntil
    ? renderMetaRow(CERTIFICATE_LABELS.validUntil, data.validUntil, 'meta-value', fontSizes.footerValue)
    : '';
  const verifyLine = data.verifyUrl
    ? `<span class="verify">${escapeHtml(CERTIFICATE_LABELS.verifyAt)} ${escapeHtml(data.verifyUrl)}</span>`
    : '';

  const body = `
    <div class="cert t-mp">
      ${renderFacets()}
      <div class="watermark" aria-hidden="true"></div>
      <header class="head">
        ${logo}
        <div class="eyebrow">${escapeHtml(CERTIFICATE_LABELS.title)}</div>
        ${subtitle ? `<div class="subtitle" style="font-size: ${fontSizes.subtitle}px;">${escapeHtml(subtitle)}</div>` : ''}
      </header>

      <main class="main">
        <div class="awarded">${escapeHtml(CERTIFICATE_LABELS.awardedTo)}</div>
        <div class="recipient" style="font-size: ${fontSizes.recipient}px;">${escapeHtml(data.recipientName)}</div>
        <div class="rule-row"><span class="rule"></span>${employeeCode}</div>
        <div class="completed">${escapeHtml(CERTIFICATE_LABELS.hasCompleted)}</div>
        <div class="course" style="font-size: ${fontSizes.course}px;">${escapeHtml(data.courseName)}</div>
        ${description ? `<div class="description" style="font-size: ${fontSizes.description}px;">${escapeHtml(description)}</div>` : ''}
      </main>

      <footer class="foot">
        <div class="meta">
          ${renderMetaRow(CERTIFICATE_LABELS.issued, data.date, 'meta-value', fontSizes.footerValue)}
          ${validUntilRow}
          ${renderMetaRow(CERTIFICATE_LABELS.reference, data.certificateId, 'meta-code', fontSizes.certId)}
        </div>
        ${renderSignatoryBlock(signatoryOne, { wrapperClass: 'signatory', nameClass: 'sig-name', roleClass: 'sig-role' })}
        ${renderSignatoryBlock(signatoryTwo, { wrapperClass: 'signatory', nameClass: 'sig-name', roleClass: 'sig-role' })}
      </footer>

      <div class="baseline">${verifyLine}</div>
      <div class="bottom-bar"></div>
    </div>
  `;

  const styles = `
    .t-mp {
      background:
        radial-gradient(circle at 100% 100%, rgba(108, 201, 242, 0.14), transparent 42%),
        radial-gradient(circle at 0% 0%, rgba(21, 89, 198, 0.06), transparent 38%),
        #ffffff;
      color: ${BRAND.ink};
      font-family: '${FONTS.sans}', sans-serif;
      padding: ${certPaddingTop}px ${certPaddingRight}px ${certPaddingBottom}px ${certPaddingLeft}px;
      display: flex;
      flex-direction: column;
    }
    .t-mp .facets {
      position: absolute;
      top: 0;
      right: 0;
      width: ${facetWidth}px;
      height: ${facetHeight}px;
    }
    .t-mp .watermark {
      position: absolute;
      left: -120px;
      bottom: -160px;
      width: 420px;
      height: 420px;
      border: 56px solid rgba(14, 165, 224, 0.06);
      transform: rotate(45deg);
    }
    .t-mp .head {
      position: relative;
      flex-shrink: 0;
      max-width: ${headingWidth}px;
    }
    .t-mp .logo {
      display: block;
      height: ${logoHeight}px;
      width: auto;
      margin-bottom: 40px;
    }
    .t-mp .logo-text {
      height: ${logoHeight}px;
      margin-bottom: 40px;
      font-size: 22px;
      font-weight: 800;
      color: ${BRAND.navy};
    }
    .t-mp .eyebrow {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: ${BRAND.blue};
      margin-bottom: 8px;
    }
    .t-mp .subtitle {
      font-weight: ${FIELDS.subtitle.fontWeight};
      line-height: ${FIELDS.subtitle.lineHeight};
      color: ${BRAND.navy};
      max-width: ${FIELDS.subtitle.maxWidth}px;
      max-height: ${FIELDS.subtitle.maxHeight}px;
      overflow: hidden;
      overflow-wrap: break-word;
    }
    .t-mp .main {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .t-mp .awarded,
    .t-mp .completed {
      font-size: 15px;
      color: ${BRAND.muted};
    }
    .t-mp .recipient {
      font-weight: ${FIELDS.recipient.fontWeight};
      line-height: ${FIELDS.recipient.lineHeight};
      letter-spacing: ${FIELDS.recipient.letterSpacingEm}em;
      text-transform: uppercase;
      color: ${BRAND.navy};
      max-width: ${FIELDS.recipient.maxWidth}px;
      max-height: ${FIELDS.recipient.maxHeight}px;
      white-space: nowrap;
      overflow: hidden;
    }
    .t-mp .rule-row {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 12px 0 16px;
    }
    .t-mp .rule {
      width: 132px;
      height: 6px;
      border-radius: 3px;
      background: linear-gradient(90deg, ${BRAND.navy}, ${BRAND.blue} 40%, ${BRAND.cyan} 75%, ${BRAND.sky});
    }
    .t-mp .employee-code {
      font-family: '${FONTS.mono}', monospace;
      font-size: 13px;
      color: ${BRAND.muted};
      letter-spacing: 0.06em;
    }
    .t-mp .course {
      font-weight: ${FIELDS.course.fontWeight};
      line-height: ${FIELDS.course.lineHeight};
      color: ${accent};
      margin-top: 4px;
      max-width: ${FIELDS.course.maxWidth}px;
      max-height: ${FIELDS.course.maxHeight}px;
      overflow: hidden;
      overflow-wrap: break-word;
    }
    .t-mp .description {
      line-height: ${FIELDS.description.lineHeight};
      color: ${BRAND.muted};
      margin-top: 10px;
      max-width: ${FIELDS.description.maxWidth}px;
      max-height: ${FIELDS.description.maxHeight}px;
      overflow: hidden;
      overflow-wrap: break-word;
    }
    .t-mp .foot {
      position: relative;
      flex-shrink: 0;
      display: grid;
      grid-template-columns: ${metaColumnWidth}px ${signatoryColumnWidth}px ${signatoryColumnWidth}px;
      gap: ${footerGap}px;
      align-items: end;
      padding-top: 18px;
      border-top: 1px solid ${BRAND.hairline};
    }
    .t-mp .meta {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .t-mp .meta-row {
      display: grid;
      grid-template-columns: ${metaColumnWidth / 2}px ${metaColumnWidth / 2}px;
      align-items: baseline;
    }
    .t-mp .meta-label {
      font-size: 12px;
      color: ${BRAND.muted};
    }
    .t-mp .meta-value {
      font-weight: ${FIELDS.footerValue.fontWeight};
      line-height: ${FIELDS.footerValue.lineHeight};
      color: ${BRAND.navy};
      white-space: nowrap;
    }
    .t-mp .meta-code {
      font-family: '${FONTS.mono}', monospace;
      line-height: ${FIELDS.certId.lineHeight};
      letter-spacing: ${FIELDS.certId.letterSpacingEm}em;
      font-weight: 700;
      color: ${BRAND.blue};
      white-space: nowrap;
    }
    .t-mp .signatory .sig-text {
      border-top: 1.5px solid ${BRAND.navy};
      padding-top: ${signatoryLineGap}px;
    }
    .t-mp .sig-name {
      font-size: ${fontSizes.signatoryName}px;
      font-weight: ${FIELDS.signatoryName.fontWeight};
      line-height: ${FIELDS.signatoryName.lineHeight};
      color: ${BRAND.navy};
      max-width: ${FIELDS.signatoryName.maxWidth}px;
      white-space: nowrap;
      overflow: hidden;
    }
    .t-mp .sig-role {
      font-size: ${fontSizes.signatoryRole}px;
      line-height: ${FIELDS.signatoryRole.lineHeight};
      color: ${BRAND.muted};
      max-width: ${FIELDS.signatoryRole.maxWidth}px;
      max-height: ${FIELDS.signatoryRole.maxHeight}px;
      overflow: hidden;
    }
    .t-mp .baseline {
      position: relative;
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      gap: 24px;
      margin-top: 14px;
      font-size: 11px;
      color: ${BRAND.muted};
    }
    .t-mp .verify {
      font-family: '${FONTS.mono}', monospace;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: ${contentWidth - 260}px;
    }
    .t-mp .bottom-bar {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: ${bottomBarHeight}px;
      background: linear-gradient(90deg, ${BRAND.navy}, ${BRAND.blue} 35%, ${BRAND.cyan} 70%, ${BRAND.sky});
    }
  `;

  return { body, styles };
};
