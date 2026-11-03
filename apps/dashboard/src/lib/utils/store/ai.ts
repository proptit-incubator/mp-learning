import { derived, writable } from 'svelte/store';
import { currentOrg } from './org';

/** Whether the server has an AI provider and has not been started with `AI_ENABLED=false`. */
export const aiConfigured = writable(false);

/** AI features show only when the server can run them and the organization has not turned them off. */
export const aiEnabled = derived(
  [aiConfigured, currentOrg],
  ([$aiConfigured, $currentOrg]) => $aiConfigured && $currentOrg.settings?.ai?.enabled !== false
);
