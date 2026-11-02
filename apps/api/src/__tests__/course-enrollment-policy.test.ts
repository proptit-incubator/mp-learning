import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { internalLearning } from '@api/middlewares/internal-learning';

const app = new Hono().use('*', internalLearning).all('*', (context) => context.json({ available: true }));

describe('internal course enrollment policy', () => {
  it.each([
    ['POST', '/course/course-id/invites'],
    ['GET', '/course/course-id/invites/link'],
    ['POST', '/course/course-id/invites/link'],
    ['PUT', '/course/course-id/invites/link'],
    ['POST', '/v1/courses/course-id/invites'],
    ['POST', '/public-api/v1/courses/course-id/invites'],
    ['GET', '/invite/student/old-token'],
    ['POST', '/invite/student/old-token/accept']
  ])('retires %s %s', async (method, path) => {
    const response = await app.request(path, { method });
    expect(response.status).toBe(404);
  });

  it.each(['/course/course-id/members', '/course/course-id/members/available', '/organization/org-id/employees'])(
    'preserves %s',
    async (path) => {
      const response = await app.request(path);
      expect(response.status).toBe(200);
    }
  );
});
