import { z } from 'zod';

export const EMPLOYEE_ROLES = ['ADMIN', 'LND', 'HR'] as const;
export const EMPLOYEE_STATUSES = ['DRAFT', 'INVITED', 'ACTIVE', 'SUSPENDED', 'LEFT'] as const;
export const ZEmployeeCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9][A-Z0-9._-]*$/);
const optionalDate = z.union([z.iso.date(), z.literal('')]).default('');

export const ZEmployeeFields = z.object({
  employeeCode: ZEmployeeCode,
  fullname: z.string().trim().min(1).max(200),
  email: z.email().trim().toLowerCase().max(254),
  department: z.string().trim().max(150).default(''),
  jobTitle: z.string().trim().max(150).default(''),
  managerId: z.uuid().nullable().default(null),
  startDate: optionalDate,
  roles: z
    .array(z.enum(EMPLOYEE_ROLES))
    .max(EMPLOYEE_ROLES.length)
    .default([])
    .transform((roles) => EMPLOYEE_ROLES.filter((role) => roles.includes(role)))
});
export const ZCreateEmployee = ZEmployeeFields.extend({ sendActivation: z.boolean().default(false) });
export const ZUpdateEmployee = ZEmployeeFields.omit({ email: true, employeeCode: true });
export const ZEmployeeStatus = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'LEFT']),
  reason: z.string().trim().min(1).max(500)
});
export const ZActivateEmployee = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((password) => new TextEncoder().encode(password).length <= 72)
    .optional()
});
export const ZEmployeeToken = ZActivateEmployee.pick({ token: true });
export const ZEmployeeList = z.object({
  profileId: z.uuid().optional(),
  enrollment: z.enum(['enrolled', 'not_enrolled']).optional(),
  completion: z.enum(['not_started', 'in_progress', 'completed']).optional(),
  certificate: z.enum(['earned', 'not_earned']).optional(),
  search: z.string().trim().max(150).default(''),
  department: z.string().max(150).default(''),
  jobTitle: z.string().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});
export const ZImportEmployees = z.object({
  rows: z.array(z.unknown()).min(1).max(1000),
  preview: z.boolean().default(true)
});
export type EmployeeFields = z.infer<typeof ZEmployeeFields>;
export type CreateEmployee = z.infer<typeof ZCreateEmployee>;
export type UpdateEmployee = z.infer<typeof ZUpdateEmployee>;
export type EmployeeListQuery = z.infer<typeof ZEmployeeList>;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
