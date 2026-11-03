import { BaseApi, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import type {
  CertificateRegister,
  CertificateRegisterRequest,
  CertificateRegisterRow,
  CertificateRegisterState,
  ExpiryWindow,
  RestoreCertificateRequest,
  RevokeCertificateRequest
} from '../utils/types';

export type RegisterFilters = {
  search: string;
  courseId: string;
  departmentId: string;
  state: CertificateRegisterState | '';
  expiringWithinDays: ExpiryWindow;
};

const EXPORT_PAGE_SIZE = 500;

export class CertificateRegisterApi extends BaseApi {
  register = $state<CertificateRegister | null>(null);
  loading = $state(true);
  failed = $state(false);
  savingId = $state('');
  limit = 25;
  #controller: AbortController | null = null;

  #query(filters: RegisterFilters, page: number, limit: number) {
    return {
      page: String(page),
      limit: String(limit),
      expiringWithinDays: String(filters.expiringWithinDays),
      ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.state ? { state: filters.state } : {})
    };
  }

  async load(filters: RegisterFilters, page = 1) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.loading = true;
    this.failed = false;
    const query = this.#query(filters, page, this.limit);
    const result = await this.execute<CertificateRegisterRequest>({
      requestFn: () => classroomio.certificate.register.$get({ query }, { init: { signal: controller.signal } }),
      logContext: 'loading the certificate register',
      onSuccess: (response) => {
        if (!controller.signal.aborted) this.register = response.data;
      }
    });
    if (controller.signal.aborted) return;

    this.failed = !result;
    this.loading = false;
  }

  /** Every certificate matching `filters`, for exports. */
  async loadAll(filters: RegisterFilters) {
    const rows: CertificateRegisterRow[] = [];
    for (let page = 1; ; page++) {
      const query = this.#query(filters, page, EXPORT_PAGE_SIZE);
      const response = await this.execute<CertificateRegisterRequest>({
        requestFn: () => classroomio.certificate.register.$get({ query }),
        logContext: 'exporting the certificate register'
      });
      if (!response) throw new Error('Certificate register export failed');

      rows.push(...response.data.rows);
      if (rows.length >= response.data.total || response.data.rows.length < EXPORT_PAGE_SIZE) return rows;
    }
  }

  async revoke(certificateId: string, reason: string) {
    this.savingId = certificateId;
    const response = await this.execute<RevokeCertificateRequest>({
      requestFn: () =>
        classroomio.certificate.register[':certificateId'].revoke.$post({ param: { certificateId }, json: { reason } }),
      logContext: 'revoking a certificate',
      onError: () => snackbar.error('certificate_register.errors.revoke')
    });
    this.savingId = '';
    if (response) snackbar.success('certificate_register.revoked');
    return Boolean(response);
  }

  async restore(certificateId: string) {
    this.savingId = certificateId;
    const response = await this.execute<RestoreCertificateRequest>({
      requestFn: () => classroomio.certificate.register[':certificateId'].restore.$post({ param: { certificateId } }),
      logContext: 'restoring a certificate',
      onError: () => snackbar.error('certificate_register.errors.restore')
    });
    this.savingId = '';
    if (response) snackbar.success('certificate_register.restored');
    return Boolean(response);
  }

  cancel() {
    this.#controller?.abort();
  }
}
