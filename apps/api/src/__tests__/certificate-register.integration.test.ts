import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { db } from '@cio/db/drizzle';
import * as schema from '@cio/db/schema';
import { eq } from 'drizzle-orm';
import { createEnrollments, recordCourseCompletion } from '@cio/db/queries/course/enrollment';
import {
  findCertificateHolder,
  listCertificateRegister,
  listCertificateRegisterFacets,
  restoreCertificate,
  revokeCertificate
} from '@cio/db/queries/course/certificate-register';

const ORGANIZATION_SCOPE = { kind: 'organization' } as const;
const QUERY = { expiringWithinDays: 30, page: 1, limit: 25 };

type TestTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback(run: (transaction: TestTransaction) => Promise<void>) {
  const rollback = new Error('ROLLBACK_REGISTER_TEST');
  try {
    await db.transaction(async (transaction) => {
      await run(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function createCertifiedEmployees(transaction: TestTransaction) {
  const profiles = await transaction.select({ id: schema.profile.id }).from(schema.profile).limit(2);
  if (profiles.length !== 2) throw new Error('Certificate register tests require two local test profiles');

  const [organization] = await transaction
    .insert(schema.organization)
    .values({ name: 'Register integration', siteName: `register-${randomUUID()}` })
    .returning();
  const [department] = await transaction
    .insert(schema.department)
    .values({ organizationId: organization.id, name: 'An toàn', nameKey: 'an toàn' })
    .returning();
  const [group] = await transaction
    .insert(schema.group)
    .values({ name: 'Register course', organizationId: organization.id })
    .returning();
  const [course] = await transaction
    .insert(schema.course)
    .values({ title: 'An toàn lao động', description: '', groupId: group.id, isPublished: true })
    .returning();

  const certificates: Array<{ id: string; employeeId: string }> = [];
  for (const [index, profile] of profiles.entries()) {
    const email = `${randomUUID()}@example.com`;
    const [member] = await transaction
      .insert(schema.organizationmember)
      .values({ organizationId: organization.id, profileId: profile.id, email, roleId: 3 })
      .returning();
    const [employee] = await transaction
      .insert(schema.employee)
      .values({
        organizationId: organization.id,
        memberId: member.id,
        employeeCode: `REG${index}${randomUUID().slice(0, 6)}`.toUpperCase(),
        fullname: index === 0 ? 'Nguyễn Văn Đức' : 'Trần Thị Mai',
        email,
        status: 'ACTIVE',
        departmentId: index === 0 ? department.id : null,
        activatedAt: new Date().toISOString()
      })
      .returning();
    await createEnrollments({ courseIds: [course.id], employeeIds: [employee.id], kind: 'ASSIGNED' }, transaction);
    const [groupMember] = await transaction
      .select()
      .from(schema.groupmember)
      .where(eq(schema.groupmember.profileId, profile.id));
    const record = await recordCourseCompletion(
      {
        courseId: course.id,
        groupMemberId: groupMember.id,
        profileId: profile.id,
        completedAt: new Date().toISOString(),
        recertificationMonths: null
      },
      transaction
    );
    const expiresAt = index === 0 ? new Date(Date.now() + 10 * 86_400_000).toISOString() : null;
    const [certificate] = await transaction
      .insert(schema.courseCertificateIssue)
      .values({
        courseId: course.id,
        profileId: profile.id,
        courseCompletionRecordId: record!.id,
        cycleNumber: record!.cycle_number,
        expiresAt,
        code: `T${randomUUID().replace(/-/g, '').slice(0, 9).toUpperCase()}`
      })
      .returning();
    certificates.push({ id: certificate.id, employeeId: employee.id });
  }

  return { organizationId: organization.id, courseId: course.id, departmentId: department.id, certificates };
}

describe.skipIf(process.env.MP_ANALYTICS_DB_TESTS !== 'true')('certificate register database', () => {
  it('lists certificates with their state and counts each state', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, certificates } = await createCertifiedEmployees(transaction);
      const register = await listCertificateRegister(organizationId, ORGANIZATION_SCOPE, QUERY, transaction);

      expect(register.summary).toEqual({ total: 2, valid: 1, expiring: 1, expired: 0, revoked: 0 });
      expect(register.rows.map((row) => row.state)).toEqual(['expiring', 'valid']);
      expect(register.rows[0]).toMatchObject({ id: certificates[0].id, department: 'An toàn' });

      const shortWindow = await listCertificateRegister(
        organizationId,
        ORGANIZATION_SCOPE,
        { ...QUERY, expiringWithinDays: 7 },
        transaction
      );
      expect(shortWindow.summary).toMatchObject({ valid: 2, expiring: 0 });

      const facets = await listCertificateRegisterFacets(organizationId, ORGANIZATION_SCOPE, transaction);
      expect(facets.courses.map((course) => course.title)).toEqual(['An toàn lao động']);
      expect(facets.departments.map((department) => department.name).sort()).toEqual(['', 'An toàn']);
    });
  });

  it('filters by state, department and accent-insensitive search', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, departmentId, certificates } = await createCertifiedEmployees(transaction);
      const list = (query: Partial<Parameters<typeof listCertificateRegister>[2]>) =>
        listCertificateRegister(organizationId, ORGANIZATION_SCOPE, { ...QUERY, ...query }, transaction);

      expect((await list({ state: 'valid' })).rows.map((row) => row.id)).toEqual([certificates[1].id]);
      expect((await list({ departmentId })).rows.map((row) => row.id)).toEqual([certificates[0].id]);
      expect((await list({ departmentId: 'none' })).rows.map((row) => row.id)).toEqual([certificates[1].id]);
      expect((await list({ search: 'nguyen van duc' })).total).toBe(1);
      expect((await list({ search: 'an toan lao' })).total).toBe(2);
    });
  });

  it('revokes and restores a certificate and names its holder', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, certificates } = await createCertifiedEmployees(transaction);
      const [profile] = await transaction.select({ id: schema.profile.id }).from(schema.profile).limit(1);

      await revokeCertificate(certificates[1].id, profile.id, 'Cấp nhầm', transaction);
      const revoked = await listCertificateRegister(organizationId, ORGANIZATION_SCOPE, QUERY, transaction);
      expect(revoked.summary.revoked).toBe(1);
      expect(revoked.rows.find((row) => row.id === certificates[1].id)).toMatchObject({
        state: 'revoked',
        revokedReason: 'Cấp nhầm'
      });
      expect(await findCertificateHolder(organizationId, certificates[1].id, transaction)).toMatchObject({
        employeeId: certificates[1].employeeId
      });

      await restoreCertificate(certificates[1].id, transaction);
      const restored = await listCertificateRegister(organizationId, ORGANIZATION_SCOPE, QUERY, transaction);
      expect(restored.summary.revoked).toBe(0);
    });
  });
});
