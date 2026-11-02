import { and, asc, eq, ilike, inArray, isNotNull, notExists, or } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';

export async function getCourseEmployeeContext(courseId: string, client: DbOrTxClient = db) {
  const [context] = await client
    .select({ groupId: schema.course.groupId, organizationId: schema.group.organizationId })
    .from(schema.course)
    .innerJoin(schema.group, eq(schema.course.groupId, schema.group.id))
    .where(eq(schema.course.id, courseId))
    .limit(1);
  return context ?? null;
}

export async function findCourseEmployees(
  organizationId: string,
  options: { search?: string; profileIds?: string[]; excludeGroupId?: string },
  client: DbOrTxClient = db
) {
  const enrolledMembership = options.excludeGroupId
    ? client
        .select({ id: schema.groupmember.id })
        .from(schema.groupmember)
        .where(
          and(
            eq(schema.groupmember.groupId, options.excludeGroupId),
            eq(schema.groupmember.profileId, schema.organizationmember.profileId)
          )
        )
    : undefined;
  return client
    .select({
      id: schema.employee.id,
      profileId: schema.organizationmember.profileId,
      employeeCode: schema.employee.employeeCode,
      name: schema.employee.fullname,
      email: schema.employee.email,
      role: schema.employee.role
    })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .where(
      and(
        eq(schema.employee.organizationId, organizationId),
        eq(schema.organizationmember.organizationId, organizationId),
        eq(schema.employee.status, 'ACTIVE'),
        eq(schema.organizationmember.status, 'ACTIVE'),
        isNotNull(schema.organizationmember.profileId),
        enrolledMembership ? notExists(enrolledMembership) : undefined,
        options.profileIds ? inArray(schema.organizationmember.profileId, options.profileIds) : undefined,
        options.search
          ? or(
              ilike(schema.employee.employeeCode, `%${options.search}%`),
              ilike(schema.employee.fullname, `%${options.search}%`),
              ilike(schema.employee.email, `%${options.search}%`)
            )
          : undefined
      )
    )
    .orderBy(asc(schema.employee.employeeCode))
    .limit(options.profileIds ? options.profileIds.length : 100);
}

export async function insertCourseEmployees(
  members: (typeof schema.groupmember.$inferInsert)[],
  client: DbOrTxClient = db
) {
  return client.insert(schema.groupmember).values(members).onConflictDoNothing().returning();
}
