import { db } from '@cio/db/drizzle';
import {
  listAssignedEnrollmentsForReminder,
  listEnrollmentsToReopen,
  updateEnrollmentDueDate
} from '@cio/db/queries/course/enrollment';
import { reopenExpiredCompletionCycle } from '@cio/db/queries/course/reset-progress';
import { EmailPreferenceLookupCache } from '@cio/db/queries/notifications';
import { getOrganizationById } from '@cio/db/queries/organization';
import { buildEmailBranding, buildEmailFromName } from '@cio/email';
import { enqueueEmailSend } from '@cio/jobs';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { getStudentEmailDeliveryLocale } from '@cio/core/services/email/localization';
import type { EmailLocale } from '@cio/utils/email';

import { log } from '../../utils/logger';

export const ASSIGNMENT_REMINDER_DAYS_BEFORE = [7, 0];
export const RECERTIFICATION_GRACE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function vietnamDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}

function formatDate(value: string, locale: EmailLocale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
}

function isMondayInVietnam(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' }).format(date) === 'Mon';
}

type OrgEmailContext = {
  from: string;
  branding: ReturnType<typeof buildEmailBranding>;
  baseUrl: string;
  name: string;
  locale: EmailLocale;
};

async function loadOrgEmailContext(
  cache: Map<string, OrgEmailContext | null>,
  organizationId: string,
  emailId: 'assignmentDueReminder' | 'recertificationReopened'
) {
  if (cache.has(organizationId)) return cache.get(organizationId) ?? null;

  const organization = await getOrganizationById(organizationId);
  const context = organization
    ? {
        from: buildEmailFromName(organization.name || 'MP Learning'),
        branding: buildEmailBranding(organization),
        baseUrl: getDashboardBaseUrl({
          siteName: organization.siteName,
          customDomain: organization.customDomain,
          isCustomDomainVerified: organization.isCustomDomainVerified
        }),
        name: organization.name || 'MP Transformation',
        locale: await getStudentEmailDeliveryLocale(organizationId, emailId)
      }
    : null;
  cache.set(organizationId, context);
  return context;
}

/**
 * Emails learners whose assigned course is due in 7 days, due today, or overdue (overdue repeats on Mondays).
 * The idempotency key carries the Vietnam calendar date, so re-running the scan the same day sends nothing twice.
 */
export async function processAssignmentDueReminderScan() {
  const includeOverdue = isMondayInVietnam();
  const rows = await listAssignedEnrollmentsForReminder({
    daysBefore: ASSIGNMENT_REMINDER_DAYS_BEFORE,
    includeOverdue
  });
  const orgCache = new Map<string, OrgEmailContext | null>();
  const preferences = new EmailPreferenceLookupCache();
  const dateKey = vietnamDateKey();
  let enqueued = 0;
  for (const row of rows) {
    const org = await loadOrgEmailContext(orgCache, row.organizationId, 'assignmentDueReminder');
    if (!org) continue;

    const allowed = await preferences.shouldSend({
      emailId: 'assignmentDueReminder',
      organizationId: row.organizationId,
      recipientEmail: row.email,
      recipientProfileId: row.profileId
    });
    if (!allowed) continue;

    const kind = row.daysUntilDue < 0 ? 'overdue' : row.daysUntilDue === 0 ? 'due' : `before_${row.daysUntilDue}`;
    try {
      await enqueueEmailSend(
        {
          kind: 'template',
          template: 'assignmentDueReminder',
          to: row.email,
          fields: {
            orgName: org.name,
            courseName: row.courseTitle,
            dueDate: formatDate(row.dueDate, org.locale),
            daysUntilDue: row.daysUntilDue,
            courseUrl: new URL(`/courses/${row.courseId}`, org.baseUrl).href,
            branding: org.branding
          },
          from: org.from,
          organizationId: row.organizationId,
          locale: org.locale
        },
        { idempotencyKey: `assignment-due:${row.enrollmentId}:${kind}:${dateKey}` }
      );
      enqueued += 1;
    } catch (error) {
      log.error('assignment-due-reminder-enqueue-failed', {
        enrollmentId: row.enrollmentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  log.info('assignment-due-reminder-scan-done', { scanned: rows.length, enqueued, includeOverdue });
  return { scanned: rows.length, enqueued, includeOverdue };
}

/**
 * Starts a new cycle for every learner whose recertification has expired, keeping the expired cycle and its
 * submissions in history. Assignments also get a new due date (`valid_until` plus the grace period, never in the
 * past) and an email; self-enrolled learners only get their progress reopened.
 */
export async function processRecertificationExpiryScan() {
  const rows = await listEnrollmentsToReopen();
  const orgCache = new Map<string, OrgEmailContext | null>();
  const preferences = new EmailPreferenceLookupCache();
  let reopened = 0;
  for (const row of rows) {
    const graceEnd = new Date(row.validUntil).getTime() + RECERTIFICATION_GRACE_DAYS * DAY_MS;
    const dueDateIso = new Date(Math.max(graceEnd, Date.now() + RECERTIFICATION_GRACE_DAYS * DAY_MS)).toISOString();
    const reopenedCycle = await db.transaction(async (tx) => {
      const cycleNumber = await reopenExpiredCompletionCycle(tx, {
        courseId: row.courseId,
        groupMemberId: row.groupMemberId,
        profileId: row.profileId
      });
      if (cycleNumber !== null && row.kind === 'ASSIGNED')
        await updateEnrollmentDueDate(row.enrollmentId, dueDateIso, tx);

      return cycleNumber;
    });
    if (reopenedCycle === null) continue;

    reopened += 1;
    if (row.kind !== 'ASSIGNED') continue;

    const org = await loadOrgEmailContext(orgCache, row.organizationId, 'recertificationReopened');
    if (!org) continue;

    const allowed = await preferences.shouldSend({
      emailId: 'recertificationReopened',
      organizationId: row.organizationId,
      recipientEmail: row.email,
      recipientProfileId: row.profileId
    });
    if (!allowed) continue;

    try {
      await enqueueEmailSend(
        {
          kind: 'template',
          template: 'recertificationReopened',
          to: row.email,
          fields: {
            orgName: org.name,
            courseName: row.courseTitle,
            validUntil: formatDate(row.validUntil, org.locale),
            dueDate: formatDate(dueDateIso, org.locale),
            courseUrl: new URL(`/courses/${row.courseId}`, org.baseUrl).href,
            branding: org.branding
          },
          from: org.from,
          organizationId: row.organizationId,
          locale: org.locale
        },
        { idempotencyKey: `recertification-reopened:${row.enrollmentId}:${row.validUntil}` }
      );
    } catch (error) {
      log.error('recertification-reopened-enqueue-failed', {
        enrollmentId: row.enrollmentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  log.info('recertification-expiry-scan-done', { scanned: rows.length, reopened });
  return { scanned: rows.length, reopened };
}
