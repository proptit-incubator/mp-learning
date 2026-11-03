import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redis = vi.hoisted(() => ({ isReady: true, ping: vi.fn() }));

vi.mock('@cio/db/drizzle', () => ({ db: { execute: vi.fn() } }));
vi.mock('@cio/core/utils/redis/redis', () => ({ redis }));

import { db } from '@cio/db/drizzle';
import { healthHandler } from './health';

const app = new Hono().get('/health', healthHandler);

beforeEach(() => {
  vi.mocked(db.execute).mockResolvedValue([] as never);
  redis.isReady = true;
  redis.ping.mockResolvedValue('PONG');
});

describe('GET /health', () => {
  it('answers 200 when the database and Redis respond', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok', database: 'ok', redis: 'ok' });
  });

  it('answers 503 and names the part that is down', async () => {
    vi.mocked(db.execute).mockRejectedValue(new Error('connection refused'));
    redis.isReady = false;

    const response = await app.request('/health');

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: 'degraded', database: 'down', redis: 'down' });
  });
});
