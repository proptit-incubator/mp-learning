import { ANALYTICS_CACHE_CONTROL, CACHE_NOTE, ORG_TEAM_RULE, TAG, analyticsForbiddenResponses } from './docs';
import {
  ZPublicApiOrgAnalyticsMeta,
  ZPublicApiOrgAnalyticsQuery,
  ZPublicApiOrgAnalyticsResponse
} from '@cio/utils/validation/public-api';
import { errorResponses, itemWithMetaResponse, jsonResponse } from '@api/utils/openapi/responses';
import { getPublicApiOrgAnalyticsService } from '@api/services/v1/analytics/org';

import { Hono } from '@api/utils/hono';
import { handlePublicApiError } from '@api/utils/errors';
import { describeRoute, validator } from 'hono-openapi';

export const v1OrgAnalyticsRouter = new Hono().get(
  '/',
  describeRoute({
    description: `Get organization analytics, with the sections chosen by include; ${ORG_TEAM_RULE}.`,
    tags: [TAG],
    responses: {
      200: jsonResponse(
        `Analytics returned; ${CACHE_NOTE}`,
        itemWithMetaResponse(ZPublicApiOrgAnalyticsResponse, ZPublicApiOrgAnalyticsMeta)
      ),
      400: errorResponses.badRequest,
      401: errorResponses.unauthorized,
      403: analyticsForbiddenResponses.orgTeam
    }
  }),
  validator('query', ZPublicApiOrgAnalyticsQuery),
  async (c) => {
    try {
      const orgId = c.get('orgId')!;
      const actorId = c.get('actorId');
      const query = c.req.valid('query');
      const { data, meta } = await getPublicApiOrgAnalyticsService(orgId, actorId, query);

      c.header('Cache-Control', ANALYTICS_CACHE_CONTROL);
      return c.json({ success: true, data, meta }, 200);
    } catch (error) {
      return handlePublicApiError(c, error, 'Failed to load analytics');
    }
  }
);
