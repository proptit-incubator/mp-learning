import * as z from 'zod';
import { ENROLLMENT_STATE_VALUES } from '../course/enrollment';

/** A department id, or `none` for employees without a department. */
const ZDepartmentFilter = z.union([z.uuid(), z.literal('none')]).optional();

export const ZLearningAnalyticsQuery = z.object({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30),
  departmentId: ZDepartmentFilter
});

export const ZLearningAssignmentsQuery = z.object({
  departmentId: ZDepartmentFilter,
  courseId: z.uuid().optional(),
  batchLabel: z.string().trim().max(100).optional(),
  state: z.enum(ENROLLMENT_STATE_VALUES).optional(),
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25)
});

export type LearningAssignmentsQuery = z.infer<typeof ZLearningAssignmentsQuery>;
