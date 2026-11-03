import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = join(import.meta.dirname, '../packages/db/src/migrations');
// Inherited from upstream before MP Learning forked: a file that was never journaled and one out-of-order timestamp.
const UNJOURNALED_FILES = new Set(['0006_clumsy_omega_flight']);
const EARLIER_TIMESTAMPS = new Set(['0002_majestic_masked_marvel']);

const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8'));
const files = new Set(
  readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.replace(/\.sql$/, ''))
);
const problems = [];

journal.entries.forEach((entry, index) => {
  const previous = journal.entries[index - 1];
  if (previous && entry.idx <= previous.idx)
    problems.push(`${entry.tag}: idx ${entry.idx} must follow ${previous.idx}`);
  if (!entry.tag.startsWith(String(entry.idx).padStart(4, '0'))) problems.push(`${entry.tag}: tag does not match idx`);
  if (!files.has(entry.tag)) problems.push(`${entry.tag}: no ${entry.tag}.sql`);

  if (previous && entry.when <= previous.when && !EARLIER_TIMESTAMPS.has(entry.tag)) {
    problems.push(`${entry.tag}: when ${entry.when} must be later than ${previous.tag} (${previous.when})`);
  }
});

const journaled = new Set(journal.entries.map((entry) => entry.tag));
for (const file of files) {
  if (!journaled.has(file) && !UNJOURNALED_FILES.has(file)) problems.push(`${file}.sql is not in meta/_journal.json`);
}

if (problems.length) {
  console.error(`Migration journal problems:\n${problems.map((problem) => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`Migration journal OK: ${journal.entries.length} migrations.`);
