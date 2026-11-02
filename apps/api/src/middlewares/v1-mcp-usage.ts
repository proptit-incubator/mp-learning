import { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import {
  completeMcpAutomationUsage,
  releaseMcpAutomationUsage,
  reserveMcpAutomationUsage
} from '@api/services/organization/automation-usage';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { MCP_TOOL_CREDIT_COST, type TAutomationUsageCategory, type TMcpToolName } from '@cio/utils/plans';

type TRouteMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const MCP_V1_ROUTE_TOOL_MAP: Record<string, Partial<Record<TRouteMethod, TMcpToolName>>> = {
  '/public-api/v1/audience': { GET: 'list_audience_members', POST: 'add_audience_member' },
  '/public-api/v1/audience/assign-courses': { POST: 'assign_audience_courses' },
  '/public-api/v1/audience/:memberId': {
    GET: 'get_audience_member',
    PUT: 'update_audience_member',
    DELETE: 'remove_audience_member'
  },
  '/public-api/v1/team': { GET: 'list_team_members' },
  '/public-api/v1/team/:memberId': { GET: 'get_team_member', PUT: 'update_team_member' },
  '/public-api/v1/organization/landing-page/featured-courses': { PUT: 'set_featured_courses' },
  '/public-api/v1/courses/:courseId/clone': { POST: 'clone_course' },
  '/public-api/v1/organization/email-templates': { GET: 'list_email_templates' },
  '/public-api/v1/organization/email-templates/:emailId/:locale': {
    GET: 'get_email_template',
    PUT: 'update_email_template',
    DELETE: 'reset_email_template'
  },
  '/public-api/v1/organization/email-templates/:emailId/:locale/test': { POST: 'send_test_email_template' },
  '/public-api/v1/courses/:courseId/members': { GET: 'list_course_members', POST: 'add_course_member' },
  '/public-api/v1/courses/:courseId/members/:memberId': {
    GET: 'get_course_member',
    PUT: 'update_course_member',
    DELETE: 'delete_course_member'
  },
  '/public-api/v1/courses/:courseId/members/:memberId/reset-progress': { POST: 'reset_course_member_progress' },
  '/public-api/v1/courses/:courseId/members/:memberId/analytics': { GET: 'get_course_member_analytics' },
  '/public-api/v1/courses/:courseId/invites': { GET: 'list_course_invites', POST: 'create_course_invite' },
  '/public-api/v1/courses/:courseId/invites/:inviteId/revoke': { POST: 'revoke_course_invite' },
  '/public-api/v1/courses/:courseId/certificate': { GET: 'get_course_certificate', PATCH: 'update_course_certificate' },
  '/public-api/v1/courses/:courseId/certificates': { GET: 'list_course_certificates' },
  '/public-api/v1/courses/:courseId/certificates/:memberId/download': { GET: 'download_course_certificate' },
  '/public-api/v1/courses/:courseId/sections': { GET: 'list_course_sections', POST: 'create_course_section' },
  '/public-api/v1/courses/:courseId/sections/:sectionId': {
    PUT: 'update_course_section',
    DELETE: 'delete_course_section'
  },
  '/public-api/v1/courses/:courseId/lessons': { GET: 'list_course_lessons' },
  '/public-api/v1/courses/:courseId/lessons/:lessonId': { GET: 'get_course_lesson', DELETE: 'delete_course_lesson' },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/notify-session-update': {
    POST: 'notify_course_lesson_session_update'
  },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/translations': { GET: 'list_course_lesson_translations' },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/translations/:locale': { PUT: 'set_course_lesson_translation' },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/history': { GET: 'list_course_lesson_history' },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/comments': {
    GET: 'list_course_lesson_comments',
    POST: 'create_course_lesson_comment'
  },
  '/public-api/v1/courses/:courseId/lessons/:lessonId/comments/:commentId': {
    PUT: 'update_course_lesson_comment',
    DELETE: 'delete_course_lesson_comment'
  },
  '/public-api/v1/courses/:courseId/content/reorder': { PUT: 'reorder_course_content' },
  '/public-api/v1/courses/:courseId/content': {
    PATCH: 'set_course_content_unlocked',
    DELETE: 'delete_course_content'
  },
  '/public-api/v1/courses/:courseId/exercises': { GET: 'list_course_exercises', POST: 'create_course_exercise' },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId': {
    GET: 'get_course_exercise',
    PUT: 'update_course_exercise',
    DELETE: 'delete_course_exercise'
  },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/notify': { POST: 'notify_course_exercise' },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/questions': { POST: 'add_exercise_question' },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/questions/:questionId': {
    PATCH: 'update_exercise_question',
    DELETE: 'delete_exercise_question'
  },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/sections': { POST: 'add_exercise_section' },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/sections/:sectionId': {
    PATCH: 'update_exercise_section',
    DELETE: 'delete_exercise_section'
  },
  '/public-api/v1/courses/:courseId/exercises/:exerciseId/notify/:jobId': { GET: 'get_course_exercise_notify_status' },
  '/public-api/v1/exercise-templates': { GET: 'list_exercise_templates' },
  '/public-api/v1/exercise-templates/:templateId': { GET: 'get_exercise_template' },
  '/public-api/v1/course-templates': { GET: 'list_course_templates' },
  '/public-api/v1/course-templates/:templateId': { GET: 'get_course_template' },
  '/public-api/v1/course-templates/:templateId/courses': { POST: 'create_course_from_template' },
  '/public-api/v1/courses/:courseId/template': { POST: 'save_course_as_template' },
  '/public-api/v1/courses/:courseId/submissions': { GET: 'list_course_submissions' },
  '/public-api/v1/courses/:courseId/submissions/:submissionId': {
    GET: 'get_course_submission',
    PATCH: 'update_course_submission',
    DELETE: 'delete_course_submission'
  },
  '/public-api/v1/courses/:courseId/submissions/:submissionId/grades': { PUT: 'grade_course_submission' },
  '/public-api/v1/courses/:courseId/marks': { GET: 'get_course_marks' },
  '/public-api/v1/analytics': { GET: 'get_org_analytics' },
  '/public-api/v1/analytics/learners/:profileId': { GET: 'get_learner_analytics' },
  '/public-api/v1/courses/:courseId/analytics': { GET: 'get_course_analytics' },
  '/public-api/v1/courses/:courseId/analytics/students': { GET: 'list_course_analytics_students' }
};

function resolveMcpToolName(method: string, routePath: string): TMcpToolName | undefined {
  return MCP_V1_ROUTE_TOOL_MAP[routePath]?.[method as TRouteMethod];
}

export const v1McpUsageMiddleware = async (c: Context, next: Next) => {
  const automationKey = c.get('automationKey');

  if (automationKey?.type !== 'mcp') {
    return next();
  }

  // GET and HEAD are reads (as in publicApiScopesMiddleware); everything else is a write, known before routing.
  const isRead = c.req.method === 'GET' || c.req.method === 'HEAD';
  const category: TAutomationUsageCategory = isRead ? 'read' : 'write';

  let reservationId: string;
  try {
    reservationId = await reserveMcpAutomationUsage(automationKey, category, `pending ${c.req.method}`);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        { success: false, error: error.message, code: error.code },
        error.statusCode as ContentfulStatusCode
      );
    }
    return c.json(
      { success: false, error: 'Failed to verify automation usage', code: ErrorCodes.AUTOMATION_USAGE_UNAVAILABLE },
      503
    );
  }

  let succeeded = false;
  try {
    await next();
    succeeded = c.res.status >= 200 && c.res.status < 300;
  } finally {
    if (succeeded) {
      const toolName = resolveMcpToolName(c.req.method, c.req.routePath);
      const action = toolName ?? `${c.req.method} ${c.req.routePath}`;
      const creditsConsumed = toolName ? MCP_TOOL_CREDIT_COST[toolName] : 0;

      // The slot is already counted, so a failure here only under-reports credits; the limit still holds.
      await completeMcpAutomationUsage(reservationId, action, creditsConsumed).catch((error) => {
        console.error('v1McpUsageMiddleware: failed to complete automation usage', error);
      });
    } else {
      // Failed requests don't count. If the release fails the slot stays counted, which errs on the safe side.
      await releaseMcpAutomationUsage(reservationId).catch((error) => {
        console.error('v1McpUsageMiddleware: failed to release automation usage', error);
      });
    }
  }
};
