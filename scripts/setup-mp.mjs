import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';

const argumentsList = process.argv.slice(2);
const emailIndex = argumentsList.indexOf('--email');
const originIndex = argumentsList.indexOf('--origin');
const email = argumentsList[emailIndex + 1]?.trim().toLowerCase();
const originValue = originIndex < 0 ? 'http://localhost:3082' : argumentsList[originIndex + 1];

if (emailIndex < 0 || !email || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
  throw new Error('Usage: node scripts/setup-mp.mjs --email admin@company.vn --origin https://learning.company.vn');
}

const originUrl = new URL(originValue);
if (
  !['http:', 'https:'].includes(originUrl.protocol) ||
  originUrl.username ||
  originUrl.password ||
  originUrl.pathname !== '/' ||
  originUrl.search ||
  originUrl.hash
) {
  throw new Error('Origin must be an HTTP(S) origin without a path, credentials, query, or fragment.');
}

if (originUrl.protocol !== 'https:' && originUrl.hostname !== 'localhost') {
  throw new Error('Use HTTPS for a deployed LMS. HTTP is supported only for localhost.');
}

if (existsSync('.env')) {
  throw new Error('.env already exists. Update it manually; existing configuration was preserved.');
}

const databasePassword = randomBytes(32).toString('hex');
const authSecret = randomBytes(48).toString('hex');
const serverKey = randomBytes(48).toString('hex');
const storageSecret = randomBytes(32).toString('hex');
const origin = originUrl.origin;
const configuration = [
  'PUBLIC_IS_SELFHOSTED=true',
  'AI_ENABLED=true',
  'PUBLIC_GOOGLE_AUTH_ENABLED=false',
  `LMS_ALLOWED_EMAILS=${email}`,
  'POSTGRES_DB=mp_learning',
  'POSTGRES_USER=mp_learning',
  `POSTGRES_PASSWORD=${databasePassword}`,
  `BETTER_AUTH_SECRET=${authSecret}`,
  `PRIVATE_SERVER_KEY=${serverKey}`,
  `DASHBOARD_ORIGIN=${origin}`,
  `TRUSTED_ORIGINS=${origin}`,
  `PUBLIC_SERVER_URL=${origin}`,
  'PRIVATE_SERVER_URL=http://api:3081',
  `PRIVATE_APP_HOST=${originUrl.hostname}`,
  'PRIVATE_APP_SUBDOMAINS=app',
  'OBJECT_STORAGE_ENDPOINT=http://storage:9000',
  'OBJECT_STORAGE_PUBLIC_ENDPOINT=http://localhost:9000',
  'OBJECT_STORAGE_ACCESS_KEY_ID=mp-learning',
  `OBJECT_STORAGE_SECRET_ACCESS_KEY=${storageSecret}`,
  'OBJECT_STORAGE_FORCE_PATH_STYLE=true',
  'OBJECT_STORAGE_MEDIA_PUBLIC_BASE_URL=http://localhost:9000/media',
  'OBJECT_STORAGE_BUCKET_MEDIA=media',
  'OBJECT_STORAGE_BUCKET_DOCUMENTS=documents',
  'OBJECT_STORAGE_BUCKET_VIDEOS=videos',
  'SMTP_HOST=',
  'SMTP_PORT=587',
  'SMTP_USER=',
  'SMTP_PASSWORD=',
  'SMTP_SENDER="MP Transformation Learning <replace-with-your-mailbox@example.com>"'
];

writeFileSync('.env', configuration.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
console.log('Created .env with unique secrets. Configure SMTP and public storage URLs before inviting employees.');
