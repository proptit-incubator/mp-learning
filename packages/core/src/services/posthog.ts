import { getCourseOrganizationId } from '@cio/db/queries/tag';
import { PLAN } from '@cio/utils/plans';

export type TEventSource =
  | 'dashboard'
  | 'public_api'
  | 'mcp'
  | 'import'
  | 'clone'
  | 'template'
  | 'agent'
  | 'onboarding'
  | 'add_org'
  | 'workspace';

export type TServerEvent = {
  event: string;
  distinctId?: string | null;
  orgId?: string | null;
  properties?: Record<string, unknown>;
};

/**
 * MP Learning sends no product analytics anywhere. The capture helpers below stay so the call sites shared with upstream
 * keep compiling, and all of them stop here.
 */
export function isServerEventsEnabled(): boolean {
  return false;
}

export async function recordServerEvents(inputs: TServerEvent[]): Promise<void> {
  void inputs;
}

export function captureServerEvents(inputs: TServerEvent[]): void {
  if (!isServerEventsEnabled() || inputs.length === 0) return;

  void recordServerEvents(inputs);
}

export function captureServerEvent(input: TServerEvent): void {
  captureServerEvents([input]);
}

/** Same as `captureServerEvent`, resolving the organization from the course in the background. */
export function captureCourseEvent(courseId: string, input: Omit<TServerEvent, 'orgId'>): void {
  if (!isServerEventsEnabled()) return;

  void (async () => {
    try {
      const orgId = await getCourseOrganizationId(courseId);
      await recordServerEvents([{ ...input, orgId, properties: { course_id: courseId, ...input.properties } }]);
    } catch (error) {
      console.error('PostHog course event error:', { event: input.event, courseId, error });
    }
  })();
}

export function identifyOrganizationGroup(orgId: string, properties: Record<string, unknown>): void {
  captureServerEvent({
    event: '$groupidentify',
    orgId,
    properties: { $group_type: 'organization', $group_key: orgId, $group_set: properties }
  });
}

export type TPlanLimitType = 'students' | 'templates' | 'ai_tokens' | 'workspaces' | 'automation_keys';

export function capturePlanLimitReached(input: {
  orgId: string;
  profileId?: string | null;
  limitType: TPlanLimitType;
  plan?: string | null;
  limit: number;
  current: number;
  blocked: boolean;
}): void {
  captureServerEvent({
    event: 'plan_limit_reached',
    distinctId: input.profileId,
    orgId: input.orgId,
    properties: {
      limit_type: input.limitType,
      plan: input.plan ?? PLAN.BASIC,
      limit: input.limit,
      current: input.current,
      blocked: input.blocked
    }
  });
}
