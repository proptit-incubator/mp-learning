import { emitOrganizationMemberWebhookEvent } from '@cio/core/services/webhook/emit';
import { AppError, ErrorCodes } from '@api/utils/errors';
import {
  type AudienceImportResult,
  type ParsedImportRow,
  type TAudienceImportRowStatus,
  isImportableEmail,
  parseAudienceImportCsv
} from '@cio/utils/validation/organization';
import type {
  TAssignAudienceCourses,
  TAudienceInviteByEmail,
  TImportAudienceMembers
} from '@cio/utils/validation/organization';
import { createEnrollments, findEmployeeByProfile } from '@cio/db/queries/course/enrollment';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { buildEmailFromName, buildEmailBranding } from '@cio/email';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import {
  createOrganizationInvite,
  createOrganizationInvites,
  createOrganizationMembers,
  getOrganizationAudienceMember,
  getLatestOrganizationInviteRowByOrgAndEmail,
  getOrgMembersByProfileIds,
  getOrganizationById,
  getOrganizationMembersByNormalizedEmails,
  getStudentOrganizationMemberByOrgAndEmail,
  hasActiveOrganizationInviteForEmail,
  revokeActiveOrganizationInvitesByEmails
} from '@cio/db/queries/organization';
import { recordOrganizationInviteAudits } from './invite';
import { getCourseGroupIds, getOrgCourseGroups, getOrgCourses } from '@cio/db/queries/course';
import { updateOrganizationAudienceMember } from '@cio/db/queries/organization';

import { ROLE } from '@cio/utils/constants';
import crypto from 'node:crypto';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { assertStudentCapacityOrThrow, getRemainingStudentSeats, notifyStudentMilestone } from './student-limit';
import type { StudentMilestoneNotification } from './student-limit';
import { db } from '@cio/db/drizzle';
import { getProfilesByEmails } from '@cio/db/queries/auth';
import { getWelcomeSessionIcs } from '../course/session-invite';
import type { TEventSource } from '@cio/core/services/posthog';
import { captureLearnerInvited, captureLearnersEnrolled } from '@api/services/product-events';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORG_INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
/** Parallel outbound invite emails; avoids sequential SMTP/API latency per recipient. */
const EMAIL_SEND_CONCURRENCY = 5;

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function buildInviteLink(
  token: string,
  org?: { siteName?: string | null; customDomain?: string | null; isCustomDomainVerified?: boolean | null }
): string {
  return `${getDashboardBaseUrl(org)}/invite/${encodeURIComponent(token)}`;
}

function getExpiryLabel(expiresAtIso: string): string {
  return new Date(expiresAtIso).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh'
  });
}

async function resolveCourseIdsAndNamesForImport(orgId: string, data: TImportAudienceMembers) {
  let courseIds: string[] = [];
  let courseNames: string[] = [];
  if (data.allCourses) {
    const courses = await getOrgCourses({ orgId });
    courseIds = courses.items.map((c) => c.id);
    courseNames = courses.items.map((c) => c.title).filter(Boolean);
  } else if (data.courseIds && data.courseIds.length > 0) {
    const courses = await getOrgCourses({ orgId, courseIds: data.courseIds });
    courseIds = courses.items.map((c) => c.id);
    courseNames = courses.items.map((c) => c.title).filter(Boolean);
  }
  return { courseIds, courseNames };
}

async function createAssignedEnrollmentsForProfiles(
  orgId: string,
  profileIds: string[],
  courseIds: string[],
  actorProfileId: string | null
): Promise<{ created: Array<{ courseId: string; profileId: string }>; targeted: number }> {
  if (courseIds.length === 0 || profileIds.length === 0) {
    return { created: [], targeted: 0 };
  }

  const employees = await Promise.all(
    profileIds.map(async (profileId) => {
      const employee = await findEmployeeByProfile(orgId, profileId);
      return employee ? { employeeId: employee.id, profileId } : null;
    })
  );
  const enrollable = employees.filter((entry): entry is { employeeId: string; profileId: string } => entry !== null);
  if (enrollable.length === 0) {
    return { created: [], targeted: 0 };
  }

  const profileIdByEmployeeId = new Map(enrollable.map((entry) => [entry.employeeId, entry.profileId]));
  const rows = await createEnrollments({
    courseIds,
    employeeIds: enrollable.map((entry) => entry.employeeId),
    kind: 'ASSIGNED',
    assignedBy: actorProfileId
  });

  return {
    created: rows.map((row) => ({ courseId: row.courseId, profileId: profileIdByEmployeeId.get(row.employeeId)! })),
    targeted: courseIds.length * enrollable.length
  };
}

async function enrollAudienceStudentProfilesInCourses(
  orgId: string,
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationById>>>,
  profileIds: string[],
  courseIds: string[],
  shouldSendEmail: boolean,
  source: TEventSource,
  actorProfileId: string | null
): Promise<{ assigned: number; alreadyEnrolled: number; emailsSent: number }> {
  if (courseIds.length === 0 || profileIds.length === 0) {
    return { assigned: 0, alreadyEnrolled: 0, emailsSent: 0 };
  }

  const uniqueProfileIds = [...new Set(profileIds)];
  const orgMembers = await getOrgMembersByProfileIds(orgId, uniqueProfileIds);
  const studentMembers = orgMembers.filter((m) => m.profileId && m.roleId === ROLE.STUDENT);
  const validProfileIds = new Set(studentMembers.map((m) => m.profileId!));
  const profileEmailMap = new Map(studentMembers.filter((m) => m.profileId).map((m) => [m.profileId!, m.email ?? '']));

  const courseGroups = await getOrgCourseGroups(orgId, courseIds);

  if (courseGroups.length === 0) {
    return { assigned: 0, alreadyEnrolled: 0, emailsSent: 0 };
  }

  const courseGroupByCourseId = new Map(courseGroups.map((cg) => [cg.courseId, cg]));
  const validProfiles = uniqueProfileIds.filter((id) => validProfileIds.has(id));

  const { created, targeted } = await createAssignedEnrollmentsForProfiles(
    orgId,
    validProfiles,
    courseGroups.map((cg) => cg.courseId),
    actorProfileId
  );
  const alreadyEnrolled = targeted - created.length;

  if (created.length > 0) {
    await invalidateOrgStats(orgId);
    captureLearnersEnrolled(
      created.flatMap((entry) => {
        const groupId = courseGroupByCourseId.get(entry.courseId)?.groupId;
        return groupId ? [{ groupId, profileId: entry.profileId, roleId: ROLE.STUDENT }] : [];
      }),
      'audience',
      source
    );
  }

  let emailsSent = 0;
  const loginUrl = getDashboardBaseUrl(organization);

  if (shouldSendEmail && created.length > 0) {
    const icsByCourseId = new Map(
      await Promise.all(courseGroups.map(async (cg) => [cg.courseId, await getWelcomeSessionIcs(cg.courseId)] as const))
    );

    const emailPromises = created
      .filter((p) => profileEmailMap.get(p.profileId))
      .map(async (p) => {
        const email = profileEmailMap.get(p.profileId)!;
        const courseGroup = courseGroupByCourseId.get(p.courseId);
        try {
          await enqueueTransactionalEmail('studentCourseWelcome', {
            to: email,
            fields: {
              orgName: organization.name,
              courseName: courseGroup?.courseTitle || 'Course',
              loginUrl,
              customMessage: courseGroup?.welcomeEmailMessage ?? undefined,
              branding: buildEmailBranding(organization)
            },
            from: buildEmailFromName(`${organization.name} (via ClassroomIO.com)`),
            idempotencyKey: `audience-course-welcome:${courseGroup?.groupId ?? p.courseId}:${p.profileId}`,
            ics: icsByCourseId.get(p.courseId),
            preference: { organizationId: orgId, recipientProfileId: p.profileId }
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`enrollAudienceStudentProfilesInCourses enqueue error for ${email}:`, emailError);
        }
      });

    await Promise.all(emailPromises);
  }

  return {
    assigned: created.length,
    alreadyEnrolled,
    emailsSent
  };
}

async function createStudentOrgInvitesAndSendEmails(input: {
  orgId: string;
  organization: NonNullable<Awaited<ReturnType<typeof getOrganizationById>>>;
  emails: string[];
  courseIds: string[];
  accessNamesLabel: string | undefined;
  invitedByProfileId: string;
  shouldSendEmail: boolean;
}): Promise<{ created: number; emailsSent: number; emailsFailed: number }> {
  const { orgId, organization, emails, courseIds, accessNamesLabel, invitedByProfileId, shouldSendEmail } = input;

  if (emails.length === 0) {
    return { created: 0, emailsSent: 0, emailsFailed: 0 };
  }

  await revokeActiveOrganizationInvitesByEmails(orgId, emails, invitedByProfileId);

  const expiresAt = new Date(Date.now() + ORG_INVITE_EXPIRY_MS).toISOString();

  const inviteInputs = emails.map((email) => {
    const token = generateToken();
    return {
      email,
      token,
      row: {
        organizationId: orgId,
        roleId: ROLE.STUDENT,
        email,
        tokenHash: hashToken(token),
        createdByProfileId: invitedByProfileId,
        expiresAt,
        isRevoked: false,
        metadata: {
          source: 'AUDIENCE_IMPORT',
          courseIds: courseIds.length > 0 ? courseIds : undefined
        }
      }
    };
  });

  const invites = await createOrganizationInvites(inviteInputs.map((i) => i.row));
  const inviteByEmail = new Map(invites.map((inv) => [(inv.email ?? '').toLowerCase(), inv]));
  const tokenByEmail = new Map(inviteInputs.map((i) => [i.email.toLowerCase(), i.token]));

  await recordOrganizationInviteAudits(
    emails.map((email) => {
      const invite = inviteByEmail.get(email)!;
      return {
        inviteId: invite.id,
        organizationId: orgId,
        eventType: 'CREATED' as const,
        actorProfileId: invitedByProfileId,
        targetEmail: email,
        ipAddress: null,
        userAgent: null,
        metadata: {
          roleId: ROLE.STUDENT,
          roleName: 'Student',
          expiresAt,
          courseIds
        }
      };
    })
  );

  let emailsSent = 0;
  let emailsFailed = 0;

  if (shouldSendEmail) {
    const emailOutcomes = await mapWithConcurrency(emails, EMAIL_SEND_CONCURRENCY, async (email) => {
      const invite = inviteByEmail.get(email)!;
      const token = tokenByEmail.get(email)!;
      try {
        const inviteLink = buildInviteLink(token, organization);
        await enqueueTransactionalEmail('studentOrgInvite', {
          to: email,
          fields: {
            email,
            orgName: organization.name,
            inviteLink,
            expiresAt: getExpiryLabel(expiresAt),
            courseNames: accessNamesLabel,
            branding: buildEmailBranding(organization)
          },
          from: buildEmailFromName(`${organization.name} (via ClassroomIO.com)`),
          organizationId: orgId,
          idempotencyKey: `student-org-invite:${invite.id}`
        });

        // Optimistic — see comment in services/organization/invite.ts.
        return {
          inviteId: invite.id,
          email,
          success: true as const,
          error: undefined as string | undefined
        };
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : 'Unknown email error';
        return { inviteId: invite.id, email, success: false as const, error: message };
      }
    });

    emailsSent = emailOutcomes.filter((o) => o.success).length;
    emailsFailed = emailOutcomes.length - emailsSent;

    await recordOrganizationInviteAudits(
      emailOutcomes.map((o) => ({
        inviteId: o.inviteId,
        organizationId: orgId,
        eventType: o.success ? ('EMAIL_SENT' as const) : ('EMAIL_FAILED' as const),
        actorProfileId: invitedByProfileId,
        targetEmail: o.email,
        ipAddress: null,
        userAgent: null,
        metadata: o.success ? {} : { error: o.error ?? 'Unknown' }
      }))
    );
  }

  return { created: emails.length, emailsSent, emailsFailed };
}

export async function importAudienceMembers(
  orgId: string,
  data: TImportAudienceMembers,
  invitedByProfileId: string,
  source: TEventSource = 'dashboard'
) {
  const organization = await getOrganizationById(orgId);
  if (!organization || !organization.siteName) {
    throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
  }

  // Structured rows when the client parsed a file; otherwise parse the pasted
  // list here so both paths classify identically.
  const parsed = data.recipients?.length
    ? {
        rows: data.recipients.map((recipient, index) => ({
          line: index + 1,
          email: recipient.email.trim().toLowerCase(),
          name: recipient.name,
          courses: recipient.courses ?? [],
          status: isImportableEmail(recipient.email) ? ('ready' as const) : ('invalid_email' as const)
        })),
        truncated: 0
      }
    : parseAudienceImportCsv(data.recipientCsv ?? '');

  // Re-check duplicates across the whole set: the client may have sent
  // structured rows without deduplicating them.
  const seenEmails = new Set<string>();
  const rows: (ParsedImportRow & { status: TAudienceImportRowStatus })[] = parsed.rows.map((row) => {
    if (row.status !== 'ready') return row;
    if (seenEmails.has(row.email)) return { ...row, status: 'duplicate_in_file' as const };

    seenEmails.add(row.email);
    return row;
  });

  const candidateEmails = rows.filter((row) => row.status === 'ready').map((row) => row.email);

  if (candidateEmails.length === 0) {
    // Nothing importable at all is still a successful call with per-row
    // reasons, so the UI can show which rows failed and why.
    return {
      ...buildImportResult(rows, { imported: 0, enrolled: 0, emailsSent: 0, emailsFailed: 0 }),
      assigned: 0,
      alreadyEnrolledInCourses: 0,
      pendingInvitesRenewed: 0,
      truncated: parsed.truncated
    };
  }

  const memberRows = await getOrganizationMembersByNormalizedEmails(orgId, candidateEmails);
  const memberByEmail = new Map(memberRows.map((m) => [m.normalizedEmail, m]));

  const newEmails: string[] = [];
  const existingStudentProfileIds: string[] = [];
  const pendingStudentEmails: string[] = [];

  for (const row of rows) {
    if (row.status !== 'ready') continue;

    const m = memberByEmail.get(row.email);

    if (!m) {
      newEmails.push(row.email);
      continue;
    }

    // Staff addresses are reported per row rather than rejecting the file: an
    // admin's own address pasted into a 900-row list should not block it.
    if (m.roleId !== ROLE.STUDENT) {
      row.status = 'is_staff';
      continue;
    }

    if (!m.profileId) {
      pendingStudentEmails.push(row.email);
      row.status = 'invite_resent';
      continue;
    }

    existingStudentProfileIds.push(m.profileId);
    row.status = 'already_member';
  }

  // Import what the plan allows and report the overflow, rather than refusing
  // the whole file when it does not fit.
  const remainingSeats = await getRemainingStudentSeats(orgId);
  // `slice` even when unlimited: aliasing `newEmails` here and clearing it below
  // would empty both.
  const admittedEmails = newEmails.slice(0, Number.isFinite(remainingSeats) ? remainingSeats : undefined);
  const rejectedForSeats = new Set(newEmails.slice(admittedEmails.length));

  for (const row of rows) {
    if (rejectedForSeats.has(row.email)) row.status = 'over_seat_limit';
  }

  newEmails.length = 0;
  newEmails.push(...admittedEmails);

  const { courseIds, courseNames } = await resolveCourseIdsAndNamesForImport(orgId, data);
  const accessNamesLabel = courseNames.length > 0 ? courseNames.join(', ') : undefined;

  const assignedToCourses = await enrollAudienceStudentProfilesInCourses(
    orgId,
    organization,
    existingStudentProfileIds,
    courseIds,
    data.sendEmail,
    source,
    invitedByProfileId
  );

  let imported = 0;
  let importEmailsSent = 0;
  let importEmailsFailed = 0;

  if (newEmails.length > 0) {
    const newMemberRows = newEmails.map((email) => ({
      organizationId: orgId,
      email,
      roleId: ROLE.STUDENT,
      verified: false
    }));

    let studentMilestoneNotification: StudentMilestoneNotification | null = null;
    let insertedMembers: Awaited<ReturnType<typeof createOrganizationMembers>> = [];

    await db.transaction(async (tx) => {
      studentMilestoneNotification = await assertStudentCapacityOrThrow(orgId, newEmails.length, tx, {
        deferNotification: true
      });
      insertedMembers = await createOrganizationMembers(newMemberRows, tx);
    });

    for (const insertedMember of insertedMembers) {
      await emitOrganizationMemberWebhookEvent('organization.member.added', orgId, insertedMember, invitedByProfileId);
    }

    if (studentMilestoneNotification) {
      notifyStudentMilestone(studentMilestoneNotification).catch((error) => {
        console.error('notifyStudentMilestone error:', error);
      });
    }

    const insertedEmails = new Set(insertedMembers.map((member) => (member.email ?? '').toLowerCase()));
    const addedEmails = newEmails.filter((email) => insertedEmails.has(email));
    const addedConcurrently = new Set(newEmails.filter((email) => !insertedEmails.has(email)));

    for (const row of rows) {
      if (row.status === 'ready' && addedConcurrently.has(row.email)) {
        row.status = 'already_member';
      }
    }

    if (courseIds.length > 0) {
      const courseGroupMappings = await getCourseGroupIds(courseIds);
      const groupIdByCourseId = new Map(courseGroupMappings.map((m) => [m.courseId, m.groupId]));
      const profiles = await getProfilesByEmails(addedEmails);
      const { created } = await createAssignedEnrollmentsForProfiles(
        orgId,
        profiles.map((profile) => profile.id),
        courseIds,
        invitedByProfileId
      );

      if (created.length > 0) {
        await invalidateOrgStats(orgId);
        captureLearnersEnrolled(
          created.flatMap((entry) => {
            const groupId = groupIdByCourseId.get(entry.courseId);
            return groupId ? [{ groupId, profileId: entry.profileId, roleId: ROLE.STUDENT }] : [];
          }),
          'audience',
          source
        );
      }
    }

    const inviteOutcome = await createStudentOrgInvitesAndSendEmails({
      orgId,
      organization,
      emails: addedEmails,
      courseIds,
      accessNamesLabel,
      invitedByProfileId,
      shouldSendEmail: data.sendEmail
    });
    imported = addedEmails.length;
    importEmailsSent = inviteOutcome.emailsSent;
    importEmailsFailed = inviteOutcome.emailsFailed;
  }

  let pendingEmailsSent = 0;
  let pendingEmailsFailed = 0;
  if (pendingStudentEmails.length > 0) {
    const pendingOutcome = await createStudentOrgInvitesAndSendEmails({
      orgId,
      organization,
      emails: pendingStudentEmails,
      courseIds,
      accessNamesLabel,
      invitedByProfileId,
      shouldSendEmail: data.sendEmail
    });
    pendingEmailsSent = pendingOutcome.emailsSent;
    pendingEmailsFailed = pendingOutcome.emailsFailed;
  }

  captureLearnerInvited({
    profileId: invitedByProfileId,
    orgId,
    target: 'org',
    inviteType: 'email',
    count: imported + pendingStudentEmails.length,
    source
  });

  return {
    ...buildImportResult(rows, {
      imported,
      enrolled: assignedToCourses.assigned,
      emailsSent: assignedToCourses.emailsSent + importEmailsSent + pendingEmailsSent,
      emailsFailed: importEmailsFailed + pendingEmailsFailed
    }),
    // Kept for the existing snackbar, which reads these directly.
    assigned: assignedToCourses.assigned,
    alreadyEnrolledInCourses: assignedToCourses.alreadyEnrolled,
    pendingInvitesRenewed: pendingStudentEmails.length,
    truncated: parsed.truncated
  };
}

/** One row per submitted recipient, in order, with the outcome for each. */
function buildImportResult(
  rows: (ParsedImportRow & { status: TAudienceImportRowStatus })[],
  totals: { imported: number; enrolled: number; emailsSent: number; emailsFailed: number }
): AudienceImportResult {
  return {
    ...totals,
    rows: rows.map((row) => ({
      email: row.email,
      name: row.name,
      status: row.status
    }))
  };
}

export async function resendAudienceInvite(orgId: string, data: TAudienceInviteByEmail, invitedByProfileId: string) {
  const organization = await getOrganizationById(orgId);
  if (!organization || !organization.siteName) {
    throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
  }

  const member = await getStudentOrganizationMemberByOrgAndEmail(orgId, data.email);
  if (!member) {
    throw new AppError('Audience member not found', ErrorCodes.VALIDATION_ERROR, 404, 'email');
  }
  if (member.profileId) {
    throw new AppError('Member has already joined', ErrorCodes.VALIDATION_ERROR, 400, 'email');
  }

  const emailToUse = member.email.toLowerCase().trim();

  const latestInvite = await getLatestOrganizationInviteRowByOrgAndEmail(orgId, emailToUse);
  const meta = (latestInvite?.metadata as { courseIds?: string[] } | undefined) ?? {};
  const courseIdsFromMetadata = meta.courseIds?.filter(Boolean) ?? [];

  let courseIds: string[] = [];
  let courseNames: string[] = [];
  if (courseIdsFromMetadata.length > 0) {
    const courses = await getOrgCourses({ orgId, courseIds: courseIdsFromMetadata });
    courseIds = courses.items.map((c) => c.id);
    courseNames = courses.items.map((c) => c.title).filter(Boolean);
  }

  await revokeActiveOrganizationInvitesByEmails(orgId, [emailToUse], invitedByProfileId);

  const expiresAt = new Date(Date.now() + ORG_INVITE_EXPIRY_MS).toISOString();
  const token = generateToken();
  const accessNamesLabel = courseNames.length > 0 ? courseNames.join(', ') : undefined;

  const invite = await createOrganizationInvite({
    organizationId: orgId,
    roleId: ROLE.STUDENT,
    email: emailToUse,
    tokenHash: hashToken(token),
    createdByProfileId: invitedByProfileId,
    expiresAt,
    isRevoked: false,
    metadata: {
      source: 'AUDIENCE_RESEND',
      courseIds: courseIds.length > 0 ? courseIds : undefined
    }
  });

  await recordOrganizationInviteAudits([
    {
      inviteId: invite.id,
      organizationId: orgId,
      eventType: 'CREATED',
      actorProfileId: invitedByProfileId,
      targetEmail: emailToUse,
      ipAddress: null,
      userAgent: null,
      metadata: {
        roleId: ROLE.STUDENT,
        roleName: 'Student',
        expiresAt,
        courseIds
      }
    }
  ]);

  let emailSent = false;
  try {
    const inviteLink = buildInviteLink(token, organization);
    await enqueueTransactionalEmail('studentOrgInvite', {
      to: emailToUse,
      fields: {
        email: emailToUse,
        orgName: organization.name,
        inviteLink,
        expiresAt: getExpiryLabel(expiresAt),
        courseNames: accessNamesLabel,
        branding: buildEmailBranding(organization)
      },
      from: buildEmailFromName(`${organization.name} (via ClassroomIO.com)`),
      organizationId: orgId,
      idempotencyKey: `student-org-invite:${invite.id}`
    });

    emailSent = true;
    // Optimistic EMAIL_SENT — worker handles retries; final failure flips
    // email_delivery to `failed` for operator follow-up.
    await recordOrganizationInviteAudits([
      {
        inviteId: invite.id,
        organizationId: orgId,
        eventType: 'EMAIL_SENT',
        actorProfileId: invitedByProfileId,
        targetEmail: emailToUse,
        ipAddress: null,
        userAgent: null,
        metadata: {}
      }
    ]);
  } catch (emailError) {
    const message = emailError instanceof Error ? emailError.message : 'Unknown email error';
    await recordOrganizationInviteAudits([
      {
        inviteId: invite.id,
        organizationId: orgId,
        eventType: 'EMAIL_FAILED',
        actorProfileId: invitedByProfileId,
        targetEmail: emailToUse,
        ipAddress: null,
        userAgent: null,
        metadata: { error: message }
      }
    ]);
  }

  return { emailSent };
}

export async function revokeAudiencePendingInvite(
  orgId: string,
  data: TAudienceInviteByEmail,
  revokedByProfileId: string
) {
  const member = await getStudentOrganizationMemberByOrgAndEmail(orgId, data.email);
  if (!member) {
    throw new AppError('Audience member not found', ErrorCodes.VALIDATION_ERROR, 404, 'email');
  }
  if (member.profileId) {
    throw new AppError('Member has already joined', ErrorCodes.VALIDATION_ERROR, 400, 'email');
  }

  const emailToUse = member.email.toLowerCase().trim();

  const hasActive = await hasActiveOrganizationInviteForEmail(orgId, emailToUse);
  if (!hasActive) {
    throw new AppError('No active pending invite to revoke', ErrorCodes.VALIDATION_ERROR, 400);
  }

  const revoked = await revokeActiveOrganizationInvitesByEmails(orgId, [emailToUse], revokedByProfileId);
  if (revoked.length === 0) {
    throw new AppError('No invite was revoked', ErrorCodes.VALIDATION_ERROR, 400);
  }

  await recordOrganizationInviteAudits(
    revoked.map((inv) => ({
      inviteId: inv.id,
      organizationId: orgId,
      eventType: 'REVOKED' as const,
      actorProfileId: revokedByProfileId,
      targetEmail: emailToUse,
      ipAddress: null,
      userAgent: null,
      metadata: { reason: 'audience_revoked_by_admin' }
    }))
  );

  return { revoked: true };
}

export async function assignAudienceToCourses(
  orgId: string,
  data: TAssignAudienceCourses,
  source: TEventSource = 'dashboard',
  actorProfileId: string | null = null
) {
  const organization = await getOrganizationById(orgId);
  if (!organization) {
    throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
  }

  const courseGroups = await getOrgCourseGroups(orgId, data.courseIds);
  if (courseGroups.length === 0) {
    throw new AppError('No valid courses found', ErrorCodes.VALIDATION_ERROR, 400, 'courseIds');
  }

  return enrollAudienceStudentProfilesInCourses(
    orgId,
    organization,
    data.profileIds,
    data.courseIds,
    data.sendEmail,
    source,
    actorProfileId
  );
}

export async function updatePendingAudienceMemberEmail(
  orgId: string,
  memberId: number,
  data: { email: string; sendEmail: boolean },
  invitedByProfileId: string
) {
  const organization = await getOrganizationById(orgId);
  if (!organization) {
    throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
  }

  const existingMember = await getOrganizationAudienceMember(orgId, memberId);
  if (!existingMember) {
    throw new AppError('Audience member not found', ErrorCodes.NOT_FOUND, 404);
  }

  if (existingMember.profileId) {
    throw new AppError(
      'Only pending audience members can be updated through this endpoint',
      ErrorCodes.VALIDATION_ERROR,
      400,
      'memberId'
    );
  }

  const normalizedEmail = data.email.toLowerCase().trim();
  const currentEmail = existingMember.email.toLowerCase().trim();

  if (!normalizedEmail) {
    throw new AppError('Email is required', ErrorCodes.VALIDATION_ERROR, 400, 'email');
  }

  if (normalizedEmail !== currentEmail) {
    const matchingMembers = await getOrganizationMembersByNormalizedEmails(orgId, [normalizedEmail]);

    if (matchingMembers.length > 0) {
      throw new AppError('An audience member with this email already exists', ErrorCodes.CONFLICT, 409, 'email');
    }
  }

  await revokeActiveOrganizationInvitesByEmails(orgId, [currentEmail, normalizedEmail], invitedByProfileId);

  const updatedMember = await updateOrganizationAudienceMember(orgId, memberId, {
    email: normalizedEmail,
    verified: false
  });

  if (!updatedMember) {
    throw new AppError('Audience member not found', ErrorCodes.NOT_FOUND, 404);
  }

  const latestInvite = await getLatestOrganizationInviteRowByOrgAndEmail(orgId, currentEmail);
  const meta = (latestInvite?.metadata as { courseIds?: string[] } | undefined) ?? {};

  await createStudentOrgInvitesAndSendEmails({
    orgId,
    organization,
    emails: [normalizedEmail],
    courseIds: meta.courseIds?.filter(Boolean) ?? [],
    accessNamesLabel: undefined,
    invitedByProfileId,
    shouldSendEmail: data.sendEmail
  });

  return updatedMember;
}
