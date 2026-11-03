import { createHash, randomBytes } from 'node:crypto';
import { expect, request, type APIRequestContext } from '@playwright/test';
import postgres from 'postgres';

export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3082';
export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? 'admin@e2e.test', password: 'E2e-admin-password-1' };

/** The run's database. Only setup steps a person would do by email (verifying, activating) touch it directly. */
export function database() {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error('E2E_DATABASE_URL is required');
  if (!new URL(url).pathname.endsWith('_e2e')) throw new Error('E2E tests only run against a database ending in _e2e');

  return postgres(url, { max: 1 });
}

export type AdminSession = { api: APIRequestContext; organizationId: string };

async function expectSuccess(response: Awaited<ReturnType<APIRequestContext['get']>>, step: string) {
  const body = await response.text();
  expect(response.ok(), `${step}: ${response.status()} ${body}`).toBeTruthy();
  return JSON.parse(body);
}

/**
 * Signs the bootstrap administrator up (the first time) and in, which creates the MP Learning organization, and
 * returns an API client that calls the API through the dashboard proxy with that session.
 */
export async function signInAdmin(): Promise<AdminSession> {
  const api = await request.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { Origin: BASE_URL } });
  const sql = database();
  try {
    const [existing] = await sql`select id from "user" where email = ${ADMIN.email}`;
    if (!existing) {
      await expectSuccess(
        await api.post('/api/auth/sign-up/email', {
          data: { email: ADMIN.email, password: ADMIN.password, name: 'E2E Admin' }
        }),
        'sign up the administrator'
      );
      await sql`update "user" set email_verified = true where email = ${ADMIN.email}`;
    }
  } finally {
    await sql.end();
  }

  await expectSuccess(
    await api.post('/api/auth/sign-in/email', { data: { email: ADMIN.email, password: ADMIN.password } }),
    'sign in the administrator'
  );
  const account = await expectSuccess(await api.get('/proxy/account'), 'load the administrator account');
  const organizationId = account.organizations[0]?.id as string;
  expect(organizationId).toBeTruthy();

  return { api, organizationId };
}

export async function apiCall<T = { data: unknown }>(
  session: AdminSession,
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  data?: unknown
): Promise<T> {
  const response = await session.api[method](`/proxy${path}`, {
    headers: { 'cio-org-id': session.organizationId },
    ...(data === undefined ? {} : { data })
  });
  return expectSuccess(response, `${method.toUpperCase()} ${path}`);
}

/** A published course with one open lesson, created the way L&D would through the API. */
export async function createCourse(session: AdminSession, title: string) {
  const course = await apiCall<{ data: { course: { id: string } } }>(session, 'post', '/course', {
    title,
    description: 'Khóa học kiểm thử end-to-end',
    organizationId: session.organizationId
  });
  const courseId = course.data.course.id;
  await apiCall(session, 'post', `/course/${courseId}/lesson`, {
    title: 'Bài 1: Giới thiệu',
    courseId,
    order: 1,
    isUnlocked: true,
    note: '<p>Nội dung bài học</p>'
  });
  await apiCall(session, 'put', `/course/${courseId}`, { isPublished: true });
  return courseId;
}

/**
 * Creates an employee and an activation link for them, as HR would send by email. Returns the token for the
 * activation page.
 */
export async function createEmployee(session: AdminSession, employee: { code: string; name: string; email: string }) {
  const created = await apiCall<{ data: { employee: { id: string } } }>(session, 'post', '/employees', {
    employeeCode: employee.code,
    fullname: employee.name,
    email: employee.email,
    department: 'Kiểm thử',
    jobTitle: 'Nhân viên',
    managerId: null,
    startDate: '',
    roles: [],
    sendActivation: false
  });
  const employeeId = created.data.employee.id;
  const token = randomBytes(32).toString('hex');
  const sql = database();
  try {
    await sql`insert into employee_activation (employee_id, token_hash, expires_at)
      values (${employeeId}, ${createHash('sha256').update(token).digest('hex')}, now() + interval '1 day')`;
    await sql`update employee set status = 'INVITED' where id = ${employeeId}`;
  } finally {
    await sql.end();
  }
  return { employeeId, token };
}
