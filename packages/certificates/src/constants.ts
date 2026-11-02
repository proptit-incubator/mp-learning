import type { CertificateDesign, CertificateTemplateId, CertificateTemplateMeta } from './types';

export const CERTIFICATE_WIDTH = 1100;
export const CERTIFICATE_HEIGHT = 780;

export const CERTIFICATE_VIEWPORT = {
  width: CERTIFICATE_WIDTH,
  height: CERTIFICATE_HEIGHT
} as const;

export const CERTIFICATE_PDF_PAGE_OPTIONS = {
  width: `${CERTIFICATE_WIDTH}px`,
  height: `${CERTIFICATE_HEIGHT}px`,
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
} as const;

export const ACCENT_COLORS = ['#1559c6', '#0e2259', '#0ea5e0', '#7a1f1f', '#d4af37', '#065f46'] as const;

export type AccentColor = (typeof ACCENT_COLORS)[number];

export const DEFAULT_ACCENT_COLOR: string = ACCENT_COLORS[0];

export const CERTIFICATE_TEMPLATES: CertificateTemplateMeta[] = [
  {
    id: 'mp',
    label: 'MP Transformation',
    description: 'Brand layout with the MP facets, navy type and a verification code.'
  },
  {
    id: 'classique',
    label: 'Classique',
    description: 'Vintage engraved with double-rule border and seal.'
  },
  {
    id: 'brutalist',
    label: 'Brutalist',
    description: 'Raw editorial grid with oversized typography and stamp.'
  },
  {
    id: 'noir',
    label: 'Noir',
    description: 'Dark editorial layout with gilt accents and medal.'
  },
  {
    id: 'poster',
    label: 'Poster',
    description: 'Maximalist editorial with colour blobs and rotated tag.'
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Refined Swiss layout with thin rules and pure typography.'
  }
];

/**
 * Maps the legacy 6 theme ids onto the new 5 templates.
 * Existing courses keep rendering until they are re-saved.
 */
export const LEGACY_THEME_MAP: Record<string, CertificateTemplateId> = {
  professional: 'classique',
  plain: 'minimal',
  purpleProfessionalBadge: 'noir',
  blueProfessionalBadge: 'noir',
  purpleBadgePattern: 'poster',
  blueBadgePattern: 'poster'
};

export const DEFAULT_CERTIFICATE_DESIGN: CertificateDesign = {
  templateId: 'mp',
  accentColor: DEFAULT_ACCENT_COLOR,
  subtitle: 'Hoàn thành khóa đào tạo',
  signatories: [
    { name: 'Trưởng phòng Đào tạo', role: 'Đào tạo & Phát triển', enabled: true },
    { name: 'Tổng Giám đốc', role: 'MP Transformation', enabled: true }
  ],
  idFormat: '{seq}'
};

/** Fixed wording printed on every certificate template. */
export const CERTIFICATE_LABELS = {
  title: 'Giấy chứng nhận',
  certifyThat: 'chứng nhận',
  presentedTo: 'trao tặng',
  awardedTo: 'Trao cho',
  hasCompleted: 'vì đã hoàn thành khóa học',
  issued: 'Ngày cấp',
  validUntil: 'Hiệu lực đến',
  reference: 'Mã chứng nhận',
  date: 'Ngày',
  award: 'Khóa học',
  distinction: 'Hạng mục',
  verified: 'Đã xác thực',
  employeeCode: 'Mã nhân viên',
  verifyAt: 'Tra cứu tại'
} as const;

export const FONTS_READY_CLASS = 'fonts-ready';
export const FONTS_READY_SELECTOR = `.${FONTS_READY_CLASS}`;
