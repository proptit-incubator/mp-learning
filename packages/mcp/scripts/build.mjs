import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { build } from 'esbuild';

// Injected rather than imported: rootDir is src/, so package.json is out of
// bounds for the compiler, and the published bundle is a single file with no
// package.json beside it to read at runtime.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const standalone = process.argv.includes('--standalone');

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  minify: true,
  sourcemap: false,
  define: {
    __MCP_VERSION__: JSON.stringify(version)
  },
  banner: {
    js: '#!/usr/bin/env node'
  }
};

if (standalone) {
  // The MP Learning dashboard serves this package as a tarball for `npx -y <url>`, so it carries its dependencies.
  mkdirSync(new URL('../dist/standalone/', import.meta.url), { recursive: true });
  await build({
    ...options,
    outfile: 'dist/standalone/index.js',
    banner: {
      js: "#!/usr/bin/env node\nimport { createRequire as __mpCreateRequire } from 'node:module';\nconst require = __mpCreateRequire(import.meta.url);"
    }
  });
  writeFileSync(
    new URL('../dist/standalone/package.json', import.meta.url),
    `${JSON.stringify(
      {
        name: 'mp-learning-mcp',
        version,
        description: 'MCP server for MP Learning',
        type: 'module',
        bin: { 'mp-learning-mcp': 'index.js' },
        engines: { node: '>=20' }
      },
      null,
      2
    )}\n`
  );
} else {
  await build({ ...options, outfile: 'dist/index.js', external: ['@modelcontextprotocol/sdk', 'zod'] });
}
