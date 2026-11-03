import * as z from 'zod';

export const CERTIFICATE_REGISTER_STATES = ['valid', 'expiring', 'expired', 'revoked'] as const;
export const CERTIFICATE_EXPIRY_WINDOWS = [30, 60, 90] as const;

export const ZCertificateRegisterQuery = z.object({
  search: z.string().trim().max(150).optional(),
  courseId: z.uuid().optional(),
  departmentId: z.union([z.uuid(), z.literal('none')]).optional(),
  state: z.enum(CERTIFICATE_REGISTER_STATES).optional(),
  expiringWithinDays: z.coerce
    .number()
    .pipe(z.union([z.literal(30), z.literal(60), z.literal(90)]))
    .default(30),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25)
});

export const ZCertificateIdParam = z.object({ certificateId: z.uuid() });

export const ZRevokeCertificate = z.object({ reason: z.string().trim().min(3).max(500) });

export type TCertificateRegisterQuery = z.infer<typeof ZCertificateRegisterQuery>;
export type TCertificateRegisterState = (typeof CERTIFICATE_REGISTER_STATES)[number];
