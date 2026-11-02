import * as z from 'zod';

export const ZEmployeeTargetFilter = z.object({
  departments: z.array(z.string().trim().min(1)).max(100).optional(),
  jobTitles: z.array(z.string().trim().min(1)).max(100).optional(),
  all: z.boolean().optional()
});

export const ZAssignCourses = z.object({
  courseIds: z.array(z.uuid()).min(1).max(50),
  employeeIds: z.array(z.uuid()).max(500).optional(),
  filter: ZEmployeeTargetFilter.optional(),
  dueDate: z.iso.datetime({ offset: true }).nullable().optional(),
  batchLabel: z.string().trim().max(120).nullable().optional(),
  message: z.string().trim().max(2000).default(''),
  sendEmail: z.boolean().default(true)
});

export const ZAssignCourseLearners = ZAssignCourses.omit({ courseIds: true });

export const ZUpdateEnrollmentDueDate = z.object({
  dueDate: z.iso.datetime({ offset: true }).nullable()
});

export const ZWaiveEnrollment = z.object({
  reason: z.string().trim().min(1).max(500),
  expiresAt: z.iso.datetime({ offset: true }).nullable().optional()
});

export const ZCourseEnrollmentParam = z.object({ courseId: z.uuid(), enrollmentId: z.uuid() });

export const ENROLLMENT_STATE_VALUES = [
  'not_started',
  'in_progress',
  'completed',
  'overdue',
  'expired',
  'waived'
] as const;

export type TEnrollmentState = (typeof ENROLLMENT_STATE_VALUES)[number];
export type TAssignCourses = z.infer<typeof ZAssignCourses>;
export type TAssignCourseLearners = z.infer<typeof ZAssignCourseLearners>;
export type TUpdateEnrollmentDueDate = z.infer<typeof ZUpdateEnrollmentDueDate>;
export type TWaiveEnrollment = z.infer<typeof ZWaiveEnrollment>;
