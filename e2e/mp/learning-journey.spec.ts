import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { BASE_URL, apiCall, createCourse, createEmployee, signInAdmin, type AdminSession } from '../helpers/mp';

/**
 * The path every employee takes: HR creates them, they activate the account, L&D assigns a course, they sign in
 * with their employee code and finish it, and the certificate shows up in the register and on its public page.
 */
test.describe.configure({ mode: 'serial' });

const RUN = randomUUID().slice(0, 6).toUpperCase();
const EMPLOYEE = { code: `E2E${RUN}`, name: 'Nguyễn Văn Kiểm', email: `e2e-${RUN.toLowerCase()}@e2e.test` };
const PASSWORD = 'E2e-learner-password-1';
const COURSE_TITLE = `An toàn thông tin ${RUN}`;

let session: AdminSession;
let activationToken = '';

/** Reuses the administrator's API session, since sign-in is rate limited per address. */
async function signInAdminPage(page: Page) {
  const { cookies } = await session.api.storageState();
  await page.context().addCookies(cookies);
}

test.beforeAll(async () => {
  session = await signInAdmin();
  const courseId = await createCourse(session, COURSE_TITLE);
  const employee = await createEmployee(session, EMPLOYEE);
  activationToken = employee.token;
  await apiCall(session, 'post', '/employees/assignments', {
    courseIds: [courseId],
    employeeIds: [employee.employeeId],
    message: '',
    sendEmail: false
  });
});

test.afterAll(async () => {
  await session?.api.dispose();
});

test('the employee activates their account from the link HR sent', async ({ page }) => {
  await page.goto(`/activate?token=${activationToken}`);
  await page.locator('#activation-password').fill(PASSWORD);
  await page.locator('#activation-confirm').fill(PASSWORD);
  await page.getByTestId('employee-activate').click();

  await expect(page.getByTestId('employee-activation-done')).toBeVisible();
});

test('the employee signs in with their employee code and finishes the assigned course', async ({ page }) => {
  await page.goto('/login');
  await page.getByTestId('auth-login-email').fill(EMPLOYEE.code);
  await page.getByTestId('auth-login-password').fill(PASSWORD);
  await page.getByTestId('auth-login-submit').click();

  await page.getByTestId('learning-continue').click();
  await page.getByTestId('lesson-mark-complete').click();
  await expect(page.getByTestId('lesson-mark-complete')).toHaveCount(0);
});

test('the certificate is in the register and verifies publicly', async ({ page, browser }) => {
  await signInAdminPage(page);
  await page.goto('/lms/certificate-register');
  const row = page.getByTestId('certificate-register-row').filter({ hasText: EMPLOYEE.code });
  await expect(row).toBeVisible();

  const register = await apiCall<{ data: { rows: Array<{ code: string; fullname: string; state: string }> } }>(
    session,
    'get',
    `/certificate/register?search=${encodeURIComponent(EMPLOYEE.code)}`
  );
  const certificate = register.data.rows[0];
  expect(certificate).toMatchObject({ fullname: EMPLOYEE.name, state: 'valid' });

  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(`${BASE_URL}/verify/${certificate.code}`);
  await expect(publicPage.getByTestId('certificate-verify-result')).toHaveAttribute('data-state', 'valid');
  await visitor.close();
});

test('the training report counts the completion', async ({ page }) => {
  await signInAdminPage(page);
  const report = await apiCall<{
    data: { snapshot: { completed: number; courses: Array<{ title: string; completed: number }> } };
  }>(session, 'get', '/dash/learning-analytics?days=30');
  expect(report.data.snapshot.courses.find((course) => course.title === COURSE_TITLE)?.completed).toBe(1);

  await page.goto('/lms/analytics');
  await expect(page.getByTestId('learning-report-department')).toBeVisible();
});

test('routes MP Learning does not serve answer 404', async () => {
  for (const path of ['/proxy/unsplash', '/proxy/dash/track', '/api/auth/token-exchange']) {
    const response = await session.api.post(path, { headers: { 'cio-org-id': session.organizationId } });
    expect(response.status(), path).toBe(404);
  }
});
