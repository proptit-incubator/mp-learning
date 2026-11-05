import * as z from 'zod';

import {
  ZPublicApiAddCourseMember,
  ZPublicApiCourseMemberParam,
  ZPublicApiCourseMembersQuery,
  ZPublicApiCourseParam,
  ZPublicApiUpdateCourseMember
} from '@cio/utils/validation/public-api';

import type { ClassroomIoApiClient } from '../api-client';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

const COURSE_TEAM_RULE = 'the API key creator must be an org admin or L&D';

const READ_ONLY: ToolAnnotations = { readOnlyHint: true, destructiveHint: false };
const WRITE: ToolAnnotations = { readOnlyHint: false, destructiveHint: false };
const DESTRUCTIVE: ToolAnnotations = { readOnlyHint: false, destructiveHint: true };

export const ZListCourseMembersToolInput = ZPublicApiCourseMembersQuery.safeExtend({
  courseId: ZPublicApiCourseParam.shape.courseId
});

export const ZAddCourseMemberToolInput = ZPublicApiAddCourseMember.safeExtend({
  courseId: ZPublicApiCourseParam.shape.courseId
});

export const ZGetCourseMemberToolInput = ZPublicApiCourseMemberParam;

export const ZUpdateCourseMemberToolInput = ZPublicApiUpdateCourseMember.safeExtend({
  courseId: ZPublicApiCourseMemberParam.shape.courseId,
  memberId: ZPublicApiCourseMemberParam.shape.memberId
});

export const ZDeleteCourseMemberToolInput = ZPublicApiCourseMemberParam;

export const ZResetCourseMemberProgressToolInput = ZPublicApiCourseMemberParam;

export const ZGetCourseMemberAnalyticsToolInput = z.object({
  courseId: ZPublicApiCourseMemberParam.shape.courseId,
  memberId: ZPublicApiCourseMemberParam.shape.memberId,
  includeProgressImpact: z.boolean().optional().describe('Also return how each lesson and exercise moves progress')
});

const listCourseMembersShape = ZListCourseMembersToolInput.shape as unknown as ZodRawShapeCompat;
const addCourseMemberShape = ZAddCourseMemberToolInput.shape as unknown as ZodRawShapeCompat;
const getCourseMemberShape = ZGetCourseMemberToolInput.shape as unknown as ZodRawShapeCompat;
const updateCourseMemberShape = ZUpdateCourseMemberToolInput.shape as unknown as ZodRawShapeCompat;
const deleteCourseMemberShape = ZDeleteCourseMemberToolInput.shape as unknown as ZodRawShapeCompat;
const resetCourseMemberProgressShape = ZResetCourseMemberProgressToolInput.shape as unknown as ZodRawShapeCompat;
const getCourseMemberAnalyticsShape = ZGetCourseMemberAnalyticsToolInput.shape as unknown as ZodRawShapeCompat;

export function registerCourseMemberTools(server: McpServer, apiClient: ClassroomIoApiClient) {
  server.tool(
    'list_course_members',
    `List everyone on a course, learners and the admin or L&D member who created it, with role and progress; ${COURSE_TEAM_RULE}.`,
    listCourseMembersShape,
    READ_ONLY,
    async (args) => {
      const { courseId, ...query } = ZListCourseMembersToolInput.parse(args);
      const result = await apiClient.listCourseMembers(courseId, query);
      return jsonContent(result);
    }
  );

  server.tool(
    'add_course_member',
    `Assign a course to an employee already in the organization, by profileId or email, as a learner (roleId 3); ${COURSE_TEAM_RULE}. Courses have no instructors, so other roles are refused. Fails with 409 if they are already a member; to add someone new, use add_audience_member.`,
    addCourseMemberShape,
    WRITE,
    async (args) => {
      const { courseId, ...payload } = ZAddCourseMemberToolInput.parse(args);
      const result = await apiClient.addCourseMember(courseId, payload);
      return jsonContent(result);
    }
  );

  server.tool(
    'get_course_member',
    `Get a course member's detail; ${COURSE_TEAM_RULE}.`,
    getCourseMemberShape,
    READ_ONLY,
    async (args) => {
      const { courseId, memberId } = ZGetCourseMemberToolInput.parse(args);
      const result = await apiClient.getCourseMember(courseId, memberId);
      return jsonContent(result);
    }
  );

  server.tool(
    'update_course_member',
    `Change a course learner's email; ${COURSE_TEAM_RULE}. Courses have no instructors, so roleId can only be 3.`,
    updateCourseMemberShape,
    WRITE,
    async (args) => {
      const { courseId, memberId, ...payload } = ZUpdateCourseMemberToolInput.parse(args);
      const result = await apiClient.updateCourseMember(
        courseId,
        memberId,
        ZPublicApiUpdateCourseMember.parse(payload)
      );
      return jsonContent(result);
    }
  );

  server.tool(
    'delete_course_member',
    `Remove a non-learner course member; ${COURSE_TEAM_RULE}. Learners are refused with a conflict so their history is kept: cancel the assignment that gave them the course instead.`,
    deleteCourseMemberShape,
    DESTRUCTIVE,
    async (args) => {
      const { courseId, memberId } = ZDeleteCourseMemberToolInput.parse(args);
      const result = await apiClient.deleteCourseMember(courseId, memberId);
      return jsonContent(result);
    }
  );

  server.tool(
    'reset_course_member_progress',
    `Clear a student's completion progress while keeping them enrolled, which cannot be undone; ${COURSE_TEAM_RULE}. Works for student members only.`,
    resetCourseMemberProgressShape,
    DESTRUCTIVE,
    async (args) => {
      const { courseId, memberId } = ZResetCourseMemberProgressToolInput.parse(args);
      const result = await apiClient.resetCourseMemberProgress(courseId, memberId);
      return jsonContent(result);
    }
  );

  server.tool(
    'get_course_member_analytics',
    `Get a student's progress and grade analytics for a course; ${COURSE_TEAM_RULE}. Works for student members only.`,
    getCourseMemberAnalyticsShape,
    READ_ONLY,
    async (args) => {
      const { courseId, memberId, includeProgressImpact } = ZGetCourseMemberAnalyticsToolInput.parse(args);
      const result = await apiClient.getCourseMemberAnalytics(courseId, memberId, includeProgressImpact);
      return jsonContent(result);
    }
  );
}

function jsonContent(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data)
      }
    ]
  };
}
