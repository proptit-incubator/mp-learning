import { db } from '@cio/db/drizzle';
import {
  findCertificateHolder,
  findOrganizationCertificate,
  listCertificateRegister,
  listCertificateRegisterFacets,
  restoreCertificate,
  revokeCertificate
} from '@cio/db/queries/course/certificate-register';
import { addEmployeeAudit, getEmployeeAccess } from '@cio/db/queries/organization';
import type { TCertificateRegisterQuery } from '@cio/utils/validation/course';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { resolveLearningAnalyticsScope } from '@api/services/learning-analytics';

/** The certificates the viewer may see: the whole organization, their reporting line, or the courses they run. */
export async function getCertificateRegister(orgId: string, actorId: string, query: TCertificateRegisterQuery) {
  const scope = await resolveLearningAnalyticsScope(orgId, actorId);
  const [register, facets, access] = await Promise.all([
    listCertificateRegister(orgId, scope, query),
    listCertificateRegisterFacets(orgId, scope),
    getEmployeeAccess(orgId, actorId)
  ]);
  return { ...register, facets, canRevoke: Boolean(access?.canManageCourses) };
}

async function requireCertificate(orgId: string, actorId: string, certificateId: string) {
  const access = await getEmployeeAccess(orgId, actorId);
  if (!access?.canManageCourses) throw new AppError('Only L&D can revoke certificates', ErrorCodes.FORBIDDEN, 403);

  const certificate = await findOrganizationCertificate(orgId, certificateId);
  if (!certificate) throw new AppError('Certificate not found', ErrorCodes.NOT_FOUND, 404);

  return certificate;
}

/** Revokes a certificate so its verification page reports it revoked, and notes it in the holder's employee log. */
export async function revokeOrganizationCertificate(
  orgId: string,
  actorId: string,
  certificateId: string,
  reason: string
) {
  await requireCertificate(orgId, actorId, certificateId);
  await db.transaction(async (tx) => {
    await revokeCertificate(certificateId, actorId, reason, tx);
    const holder = await findCertificateHolder(orgId, certificateId, tx);
    if (holder)
      await addEmployeeAudit(holder.employeeId, actorId, 'CERTIFICATE_REVOKED', `${holder.code}: ${reason}`, tx);
  });
  return { id: certificateId, status: 'revoked' as const };
}

export async function restoreOrganizationCertificate(orgId: string, actorId: string, certificateId: string) {
  await requireCertificate(orgId, actorId, certificateId);
  await db.transaction(async (tx) => {
    await restoreCertificate(certificateId, tx);
    const holder = await findCertificateHolder(orgId, certificateId, tx);
    if (holder) await addEmployeeAudit(holder.employeeId, actorId, 'CERTIFICATE_RESTORED', holder.code, tx);
  });
  return { id: certificateId, status: 'valid' as const };
}
