import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEmployeeAccess: vi.fn(),
  addEmployeeAudit: vi.fn(),
  findOrganizationCertificate: vi.fn(),
  findCertificateHolder: vi.fn(),
  listCertificateRegister: vi.fn(),
  listCertificateRegisterFacets: vi.fn(),
  revokeCertificate: vi.fn(),
  restoreCertificate: vi.fn(),
  resolveLearningAnalyticsScope: vi.fn()
}));

vi.mock('@cio/db/drizzle', () => ({ db: { transaction: (run: (tx: object) => unknown) => run({}) } }));
vi.mock('@cio/db/queries/organization', () => ({
  getEmployeeAccess: mocks.getEmployeeAccess,
  addEmployeeAudit: mocks.addEmployeeAudit
}));
vi.mock('@cio/db/queries/course/certificate-register', () => ({
  findOrganizationCertificate: mocks.findOrganizationCertificate,
  findCertificateHolder: mocks.findCertificateHolder,
  listCertificateRegister: mocks.listCertificateRegister,
  listCertificateRegisterFacets: mocks.listCertificateRegisterFacets,
  revokeCertificate: mocks.revokeCertificate,
  restoreCertificate: mocks.restoreCertificate
}));
vi.mock('@api/services/learning-analytics', () => ({
  resolveLearningAnalyticsScope: mocks.resolveLearningAnalyticsScope
}));

import {
  getCertificateRegister,
  restoreOrganizationCertificate,
  revokeOrganizationCertificate
} from '@api/services/course/certificate-register';

describe('certificate register service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOrganizationCertificate.mockResolvedValue({ id: 'cert-1', status: 'valid', courseId: 'course-1' });
    mocks.findCertificateHolder.mockResolvedValue({ employeeId: 'employee-1', code: 'K7QX2M9DPA' });
  });

  it('lists the register in the viewer scope and says whether they may revoke', async () => {
    mocks.resolveLearningAnalyticsScope.mockResolvedValue({ kind: 'reports', managerEmployeeId: 'manager-1' });
    mocks.listCertificateRegister.mockResolvedValue({ rows: [], total: 0 });
    mocks.getEmployeeAccess.mockResolvedValue({ canManageCourses: false });

    const register = await getCertificateRegister('org-1', 'actor-1', {
      expiringWithinDays: 30,
      page: 1,
      limit: 25
    });

    expect(mocks.listCertificateRegister).toHaveBeenCalledWith(
      'org-1',
      { kind: 'reports', managerEmployeeId: 'manager-1' },
      expect.objectContaining({ page: 1 })
    );
    expect(register.canRevoke).toBe(false);
  });

  it('lets L&D revoke and records it in the holder employee log', async () => {
    mocks.getEmployeeAccess.mockResolvedValue({ canManageCourses: true });

    await revokeOrganizationCertificate('org-1', 'actor-1', 'cert-1', 'Cấp nhầm');

    expect(mocks.revokeCertificate).toHaveBeenCalledWith('cert-1', 'actor-1', 'Cấp nhầm', {});
    expect(mocks.addEmployeeAudit).toHaveBeenCalledWith(
      'employee-1',
      'actor-1',
      'CERTIFICATE_REVOKED',
      'K7QX2M9DPA: Cấp nhầm',
      {}
    );
  });

  it('refuses HR or managers and certificates of other organizations', async () => {
    mocks.getEmployeeAccess.mockResolvedValue({ canManageCourses: false });
    await expect(revokeOrganizationCertificate('org-1', 'actor-1', 'cert-1', 'Cấp nhầm')).rejects.toMatchObject({
      statusCode: 403
    });

    mocks.getEmployeeAccess.mockResolvedValue({ canManageCourses: true });
    mocks.findOrganizationCertificate.mockResolvedValue(null);
    await expect(restoreOrganizationCertificate('org-1', 'actor-1', 'cert-x')).rejects.toMatchObject({
      statusCode: 404
    });
    expect(mocks.restoreCertificate).not.toHaveBeenCalled();
  });
});
