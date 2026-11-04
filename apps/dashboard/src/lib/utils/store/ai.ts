import { derived, writable } from 'svelte/store';
import { currentOrg } from './org';

/**
 * Whether the server has an AI provider and has not been started with `AI_ENABLED=false`. `null` until the account
 * has loaded, so pages can wait instead of treating "not known yet" as "off".
 */
export const aiConfigured = writable<boolean | null>(null);

/** AI features show only when the server can run them and the organization has not turned them off. */
export const aiEnabled = derived([aiConfigured, currentOrg], ([$aiConfigured, $currentOrg]) =>
  $aiConfigured === null ? null : $aiConfigured && $currentOrg.settings?.ai?.enabled !== false
);
