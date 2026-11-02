import { BaseApi, classroomio } from '$lib/utils/services/api';
import type { VerifiedCertificate, VerifyCertificateRequest } from '../utils/types';

export class CertificateVerifyApi extends BaseApi {
  certificate = $state<VerifiedCertificate | null>(null);
  loading = $state(true);
  notFound = $state(false);

  async load(code: string) {
    this.loading = true;
    this.notFound = false;
    this.certificate = null;
    await this.execute<VerifyCertificateRequest>({
      requestFn: () => classroomio.certificate.verify[':code'].$get({ param: { code } }),
      logContext: 'verifying certificate',
      onSuccess: (response) => {
        this.certificate = response.data;
      },
      onError: () => {
        this.notFound = true;
      }
    });
    this.loading = false;
  }
}
