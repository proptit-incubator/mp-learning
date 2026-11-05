import { z } from 'zod';

/** Replaced with the package version at build time; absent when run from source. */
declare const __MCP_VERSION__: string | undefined;

export const MCP_VERSION = typeof __MCP_VERSION__ === 'string' ? __MCP_VERSION__ : 'dev';

const ZConfig = z.object({
  CLASSROOMIO_API_URL: z.url().default('https://mplearning.proptit.com'),
  CLASSROOMIO_API_KEY: z.string().min(1),
  CLASSROOMIO_USER_AGENT: z.string().min(1).default(`mp-learning-mcp/${MCP_VERSION}`)
});

export type McpServerConfig = z.infer<typeof ZConfig>;

export function getConfig(env: NodeJS.ProcessEnv = process.env): McpServerConfig {
  return ZConfig.parse(env);
}
