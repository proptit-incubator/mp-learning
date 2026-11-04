import type { TLocale } from '@cio/db/types';
import { ORG_ROUTE_SLUG } from '$lib/utils/functions/routes/org-routes';

export type AppOrgParams = {
  isOrgSite: boolean;
  orgSiteName: string;
  /** Tenant identity used for pending invite checks and explicit academy joining. */
  orgId?: string | null;
  orgLocale?: TLocale;
  orgLocaleEnforced?: boolean;
};

type LayoutOrgData = {
  isOrgSite: boolean;
  orgSiteName: string;
  org: {
    id?: string;
    siteName?: string | null;
    settings?: { language?: { locale?: TLocale; enforced?: boolean } };
  } | null;
};

/**
 * Resolve which organization the dashboard should treat as "current" for API calls.
 *
 * - Org sites: subdomain/custom domain from `getOrgSiteInfo`.
 * - App host: the admin pages, served at short paths through the `/org/[slug]` routes.
 */
export function resolveAppOrgParams(layoutData: LayoutOrgData, pathname: string, slugParam?: string): AppOrgParams {
  if (layoutData.isOrgSite) {
    return {
      isOrgSite: true,
      orgSiteName: layoutData.orgSiteName,
      orgId: layoutData.org?.id ?? null,
      orgLocale: layoutData.org?.settings?.language?.locale,
      orgLocaleEnforced: layoutData.org?.settings?.language?.enforced
    };
  }

  const adminOrgSlug = slugParam === ORG_ROUTE_SLUG ? (layoutData.org?.siteName ?? '') : '';

  return {
    isOrgSite: false,
    orgSiteName: adminOrgSlug,
    orgId: null
  };
}
