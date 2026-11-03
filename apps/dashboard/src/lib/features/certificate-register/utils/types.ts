import { classroomio, type InferResponseType } from '$lib/utils/services/api';

export type CertificateRegisterRequest = typeof classroomio.certificate.register.$get;
export type CertificateRegister = Extract<InferResponseType<CertificateRegisterRequest>, { success: true }>['data'];
export type CertificateRegisterRow = CertificateRegister['rows'][number];
export type CertificateRegisterState = CertificateRegisterRow['state'];
export type CertificateRegisterSummary = CertificateRegister['summary'];
export type RevokeCertificateRequest = (typeof classroomio.certificate.register)[':certificateId']['revoke']['$post'];
export type RestoreCertificateRequest = (typeof classroomio.certificate.register)[':certificateId']['restore']['$post'];
export type ExpiryWindow = 30 | 60 | 90;
