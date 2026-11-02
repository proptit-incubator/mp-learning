import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCourseById: vi.fn(),
  getOrganizationById: vi.fn(),
  getProfileById: vi.fn(),
  getCourseOrganizationId: vi.fn(),
  ensureLatestCycleCertificate: vi.fn(),
  findCertificateByCode: vi.fn(),
  findEmployeeProfile: vi.fn()
}));

vi.mock('@cio/db/queries', () => ({
  getCourseById: mocks.getCourseById,
  getOrganizationById: mocks.getOrganizationById,
  getProfileById: mocks.getProfileById,
  getCourseOrganizationId: mocks.getCourseOrganizationId
}));
vi.mock('@cio/db/queries/course/certificate-issue', () => ({
  ensureLatestCycleCertificate: mocks.ensureLatestCycleCertificate,
  findCertificateByCode: mocks.findCertificateByCode
}));
vi.mock('@cio/db/queries/organization', () => ({ findEmployeeProfile: mocks.findEmployeeProfile }));
vi.mock('@cio/core/config/dashboard-url', () => ({ getDashboardBaseUrl: () => 'https://learning.example.vn' }));

import {
  assembleCertificateRender,
  formatCertificateDate,
  formatCertificateId,
  generateCertificateCode,
  verifyCertificate
} from '@api/services/course/certificate';

const issue = {
  id: 'issue-1',
  code: 'K7QX2M9DPA',
  cycleNumber: 2,
  issuedAt: '2026-11-02T20:00:00.000Z',
  expiresAt: '2027-11-02T20:00:00.000Z',
  status: 'valid'
};

describe('course certificate rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCourseById.mockResolvedValue([
      { title: 'An toàn thông tin', description: 'Mô tả', certificate: { design: { templateId: 'mp' } } }
    ]);
    mocks.getCourseOrganizationId.mockResolvedValue('org-1');
    mocks.getOrganizationById.mockResolvedValue({ name: 'MP Transformation', avatarUrl: null });
    mocks.ensureLatestCycleCertificate.mockResolvedValue(issue);
    mocks.findEmployeeProfile.mockResolvedValue({ fullname: 'Nguyễn Thị Hằng', employeeCode: 'MP010' });
  });

  it('prints the employee, the stored issue date in Vietnam time and the verification code', async () => {
    const { data } = await assembleCertificateRender('course-1', 'profile-1');

    expect(data).toMatchObject({
      recipientName: 'Nguyễn Thị Hằng',
      employeeCode: 'MP010',
      date: '03/11/2026',
      validUntil: '03/11/2027',
      certificateId: 'K7QX2M9DPA',
      verifyUrl: 'https://learning.example.vn/verify/K7QX2M9DPA'
    });
    expect(data.orgLogoUrl).toMatch(/^data:image\/png;base64,/);
    expect(mocks.ensureLatestCycleCertificate).toHaveBeenCalledWith(
      'course-1',
      'profile-1',
      expect.objectContaining({ code: expect.any(String) })
    );
  });

  it('refuses to render without a completion cycle', async () => {
    mocks.ensureLatestCycleCertificate.mockResolvedValue(null);

    await expect(assembleCertificateRender('course-1', 'profile-1')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('generates unguessable codes without ambiguous characters', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateCertificateCode()));

    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{10}$/);
  });

  it('formats certificate ids and dates in Vietnam time', () => {
    const issuedAt = new Date('2026-12-31T18:30:00.000Z');

    expect(formatCertificateDate(issuedAt.toISOString())).toBe('01/01/2027');
    expect(formatCertificateId('MP-{year}-{seq}', 'K7QX2M9DPA', issuedAt)).toBe('MP-2027-K7QX2M9DPA');
  });

  it.each([
    [{ status: 'valid', expiresAt: null }, 'valid'],
    [{ status: 'valid', expiresAt: '2020-01-01T00:00:00.000Z' }, 'expired'],
    [{ status: 'revoked', expiresAt: null }, 'revoked']
  ])('reports a verified certificate as %o → %s', async (overrides, state) => {
    mocks.findCertificateByCode.mockResolvedValue({
      ...issue,
      ...overrides,
      courseTitle: 'An toàn thông tin',
      organizationName: 'MP Transformation',
      recipientName: 'Nguyễn Thị Hằng',
      employeeCode: 'MP010'
    });

    const result = await verifyCertificate(' k7qx2m9dpa ');

    expect(mocks.findCertificateByCode).toHaveBeenCalledWith('K7QX2M9DPA');
    expect(result.state).toBe(state);
  });

  it('returns 404 for unknown verification codes', async () => {
    mocks.findCertificateByCode.mockResolvedValue(null);

    await expect(verifyCertificate('UNKNOWN123')).rejects.toMatchObject({ statusCode: 404 });
  });
});
