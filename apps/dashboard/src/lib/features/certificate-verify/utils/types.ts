import { classroomio, type InferResponseType } from '$lib/utils/services/api';

export type VerifyCertificateRequest = (typeof classroomio.certificate.verify)[':code']['$get'];
export type VerifyCertificateSuccess = Extract<InferResponseType<VerifyCertificateRequest>, { success: true }>;
export type VerifiedCertificate = VerifyCertificateSuccess['data'];
