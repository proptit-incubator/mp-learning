import * as z from 'zod';

import { ROLE } from '../../constants/roles';
import { ZPublicApiCourseParam } from './course';
import { ZPublicApiPaginationQuery } from './pagination';

const ZPublicApiCourseRoleId = z
  .union([z.literal(ROLE.ADMIN), z.literal(ROLE.TUTOR), z.literal(ROLE.STUDENT)])
  .describe('3 = learner. Courses have no instructors, so 1 and 2 are refused');

export const ZPublicApiCourseMemberParam = ZPublicApiCourseParam.extend({
  memberId: z.string().uuid()
});
export type TPublicApiCourseMemberParam = z.infer<typeof ZPublicApiCourseMemberParam>;

export const ZPublicApiCourseMembersQuery = ZPublicApiPaginationQuery.extend({
  search: z.string().trim().max(200).optional(),
  roleId: z.coerce.number().int().min(1).optional()
});
export type TPublicApiCourseMembersQuery = z.infer<typeof ZPublicApiCourseMembersQuery>;

export const ZPublicApiAddCourseMember = z
  .object({
    profileId: z.uuid().optional().describe('Must belong to someone already in your organization.'),
    roleId: ZPublicApiCourseRoleId,
    email: z
      .email()
      .optional()
      .describe(
        "Must belong to someone already in your organization; it is linked to that person's profile. To add someone new, add them to the organization first."
      ),
    name: z.string().optional().describe('Display name for the welcome email')
  })
  .refine((data) => Boolean(data.profileId) || Boolean(data.email), {
    message: 'Either profileId or email must be provided',
    path: ['profileId']
  });
export type TPublicApiAddCourseMember = z.infer<typeof ZPublicApiAddCourseMember>;

export const ZPublicApiUpdateCourseMember = z
  .object({
    roleId: ZPublicApiCourseRoleId.optional(),
    email: z.email().optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });
export type TPublicApiUpdateCourseMember = z.infer<typeof ZPublicApiUpdateCourseMember>;

export const ZPublicApiCourseMemberAnalyticsQuery = z.object({
  includeProgressImpact: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true')
});
export type TPublicApiCourseMemberAnalyticsQuery = z.infer<typeof ZPublicApiCourseMemberAnalyticsQuery>;
