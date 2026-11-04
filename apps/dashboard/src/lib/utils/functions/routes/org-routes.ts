/**
 * MP Learning runs one organization, so its admin pages live at short paths such as `/dash` or `/courses`.
 * The route files still sit under `/org/[slug]`; `ORG_ROUTE_SLUG` stands in for the slug, and the org layout
 * resolves it to the one organization.
 */
export const ORG_ROUTE_SLUG = '_';

/** The admin home, where L&D drafts courses with AI. */
export const ORG_HOME_PATH = '/studio';

const ORG_SECTIONS = /^\/(dash|employees|analytics|media|tags|community|settings|automation|mcp|audience)(\/.*)?$/;
const ORG_EXACT_PAGES = /^\/(courses|courses\/templates|api)\/?$/;

/** The internal `/org/_/...` route for a short admin path, or undefined for every other path. */
export function orgSectionRoute(pathname: string): string | undefined {
  if (pathname === ORG_HOME_PATH || pathname === `${ORG_HOME_PATH}/`) return `/org/${ORG_ROUTE_SLUG}`;
  if (ORG_SECTIONS.test(pathname) || ORG_EXACT_PAGES.test(pathname)) return `/org/${ORG_ROUTE_SLUG}${pathname}`;

  return undefined;
}

/** Where an old `/org/<slug>/...` link now lives, or undefined when `pathname` is not one. */
export function legacyOrgPathRedirect(pathname: string): string | undefined {
  const match = /^\/org\/[^/]+(\/.*)?$/.exec(pathname);
  if (!match) return undefined;

  const rest = (match[1] ?? '').replace(/\/$/, '');
  return rest ? rest : ORG_HOME_PATH;
}
