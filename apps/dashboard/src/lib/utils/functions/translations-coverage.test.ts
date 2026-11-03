import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import vi from '../translations/vi.json';
import en from '../translations/en.json';

const SOURCE_ROOT = join(__dirname, '../..');
const KEY_CALL =
  /(?:\$t|\bt\.get|snackbar\.(?:success|error|info|warning))\(\s*['"]([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)['"]/g;

function flatten(node: Record<string, unknown>, path = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) => {
    const full = path ? `${path}.${key}` : key;
    return value && typeof value === 'object' ? flatten(value as Record<string, unknown>, full) : [full];
  });
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return name === 'translations' ? [] : sourceFiles(path);
    return /\.(svelte|ts)$/.test(name) && !name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('dashboard translations', () => {
  const viKeys = new Set(flatten(vi));
  const enKeys = new Set(flatten(en));

  it('keeps Vietnamese and English in step', () => {
    expect([...viKeys].filter((key) => !enKeys.has(key))).toEqual([]);
    expect([...enKeys].filter((key) => !viKeys.has(key))).toEqual([]);
  });

  it('has a string for every key the code asks for by name', () => {
    const missing = sourceFiles(SOURCE_ROOT).flatMap((file) =>
      [...readFileSync(file, 'utf8').matchAll(KEY_CALL)]
        .map((match) => match[1])
        .filter((key) => !viKeys.has(key))
        .map((key) => `${relative(SOURCE_ROOT, file)}: ${key}`)
    );

    expect(missing).toEqual([]);
  });
});
