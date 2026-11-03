import type { Context } from 'hono';
import { sql } from 'drizzle-orm';
import { db } from '@cio/db/drizzle';
import { redis } from '@cio/core/utils/redis/redis';

const CHECK_TIMEOUT_MS = 2_000;

async function check(run: () => Promise<unknown>): Promise<'ok' | 'down'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });

  try {
    await Promise.race([run(), timeout]);
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

/** Liveness for Docker and monitoring: 200 when PostgreSQL and Redis both answer, 503 otherwise. */
export async function healthHandler(c: Context) {
  const [database, cache] = await Promise.all([
    check(() => db.execute(sql`select 1`)),
    check(() => (redis.isReady ? redis.ping() : Promise.reject(new Error('not connected'))))
  ]);
  const healthy = database === 'ok' && cache === 'ok';

  return c.json({ status: healthy ? 'ok' : 'degraded', database, redis: cache }, healthy ? 200 : 503);
}
