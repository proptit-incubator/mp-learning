import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  env: { MODERATION_EMAIL: '' as string | undefined }
}));

vi.mock('@cio/db/queries/report', () => ({
  createContentReport: vi.fn(),
  findActiveContentReport: vi.fn(),
  getContentReportById: vi.fn(),
  listContentReports: vi.fn(),
  updateContentReport: vi.fn()
}));
vi.mock('@cio/db/queries/report/targets', () => ({ resolveReportTarget: vi.fn() }));
vi.mock('@cio/db/queries/organization', () => ({
  getOrganizationById: vi.fn(),
  listTrainingStaffEmails: vi.fn()
}));
vi.mock('@cio/db/queries/group', () => ({ isUserCourseMemberOrOrgAdmin: vi.fn() }));
vi.mock('@api/services/jobs/email-jobs', () => ({ enqueueTransactionalEmail: vi.fn() }));
vi.mock('@cio/core/config/dashboard-url', () => ({ getAppBaseUrl: () => 'https://learn.mp.test' }));
vi.mock('@cio/core/config/env', () => ({ env: mocks.env }));

import { createContentReport, findActiveContentReport } from '@cio/db/queries/report';
import { resolveReportTarget } from '@cio/db/queries/report/targets';
import { getOrganizationById, listTrainingStaffEmails } from '@cio/db/queries/organization';
import { enqueueTransactionalEmail } from '@api/services/jobs/email-jobs';
import { submitContentReport } from '@api/services/report';

const submit = () =>
  submitContentReport({
    orgId: 'org-1',
    reporterId: 'reporter-1',
    payload: { targetType: 'community_question', targetId: 'question-1', reason: 'spam', details: undefined }
  });

describe('submitContentReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.env.MODERATION_EMAIL = '';
    vi.mocked(resolveReportTarget).mockResolvedValue({
      organizationId: 'org-1',
      targetType: 'community_question',
      targetId: 'question-1',
      authorProfileId: 'author-1',
      courseId: null,
      snapshot: { text: 'Nội dung', url: '/community/question-1' }
    } as never);
    vi.mocked(findActiveContentReport).mockResolvedValue(null as never);
    vi.mocked(getOrganizationById).mockResolvedValue({ name: 'MP Transformation' } as never);
    vi.mocked(createContentReport).mockResolvedValue({ id: 'report-1', status: 'open' } as never);
  });

  it('emails the organization training staff instead of an outside address', async () => {
    vi.mocked(listTrainingStaffEmails).mockResolvedValue(['lnd@mp.test']);

    await submit();

    expect(listTrainingStaffEmails).toHaveBeenCalledWith('org-1');
    expect(enqueueTransactionalEmail).toHaveBeenCalledWith(
      'contentReportAlert',
      expect.objectContaining({ to: ['lnd@mp.test'] })
    );
  });

  it('adds the configured moderation inbox once', async () => {
    mocks.env.MODERATION_EMAIL = 'moderation@mp.test';
    vi.mocked(listTrainingStaffEmails).mockResolvedValue(['admin@mp.test', 'moderation@mp.test']);

    await submit();

    expect(enqueueTransactionalEmail).toHaveBeenCalledWith(
      'contentReportAlert',
      expect.objectContaining({ to: ['admin@mp.test', 'moderation@mp.test'] })
    );
  });

  it('sends nothing when nobody can moderate', async () => {
    vi.mocked(listTrainingStaffEmails).mockResolvedValue([]);

    await expect(submit()).resolves.toEqual({ id: 'report-1', status: 'open' });
    expect(enqueueTransactionalEmail).not.toHaveBeenCalled();
  });
});
