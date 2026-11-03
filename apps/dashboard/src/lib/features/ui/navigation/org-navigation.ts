import BookOpenIcon from '@lucide/svelte/icons/book-open';
import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
import ContactRoundIcon from '@lucide/svelte/icons/contact-round';
import FolderOpenIcon from '@lucide/svelte/icons/folder-open';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import MessagesSquareIcon from '@lucide/svelte/icons/messages-square';
import PlugIcon from '@lucide/svelte/icons/plug';
import SettingsIcon from '@lucide/svelte/icons/settings';
import SparklesIcon from '@lucide/svelte/icons/sparkles';
import TagsIcon from '@lucide/svelte/icons/tags';

import type { AccountOrg } from '$features/app/types';
import type { Component } from 'svelte';
import { isActive } from '$lib/utils/functions/app';
import type { PlanLimitResource } from '@cio/utils/plans';
import type { OrgNavCountKey, OrgNavCounts } from '$features/ui/sidebar/org-sidebar/org-nav-counts.svelte';

export interface NavItem {
  title: string;
  url: string;
  path: string; // Actual path (e.g., '/settings') for breadcrumb generation
  /** Stable Playwright hook, e.g. org-nav-courses */
  testId: string;
  icon?: Component;
  isActive?: boolean;
  isExpanded?: boolean;
  /** When set, `isActive` for this item is determined by this regex on the pathname */
  matchPattern?: string;
  items?: NavItem[]; // for nested items like settings
  isPaid?: boolean; // Show upgrade indicator for free plan users
  /** True when this item's plan-limited resource has hit its cap (drives the upgrade indicator). */
  upgrade?: boolean;
  disabled?: boolean;
  // Metadata for breadcrumb generation
  useHashUrl?: boolean; // Use '#' as URL (for collapsible items like settings)
  nestedRoutes?: NestedRouteConfig[]; // Static nested routes (like community/ask, settings/customize-lms)
  supportsDynamicSegment?: boolean; // Supports dynamic segments (like [slug])
  /** Unfiltered resource total shown on the far right of the org sidebar. */
  count?: number;
  /** Show a "New" badge on the org sidebar. */
  isNew?: boolean;
}

export interface NavItemConfig {
  titleKey: string;
  path: string;
  icon?: Component;
  requiresAdmin?: boolean;
  disableWhenNotAdmin?: boolean;
  items?: NavItemConfig[];
  useHashUrl?: boolean; // Use '#' as URL (for collapsible items like settings)
  nestedRoutes?: NestedRouteConfig[]; // Static nested routes
  supportsDynamicSegment?: boolean; // Supports dynamic segments (like [slug])
  matchPattern?: string | ((orgSlug: string) => string); // Regex pattern for route matching
  isPaid?: boolean; // Show upgrade indicator for free plan users
  /** Plan-limited resource this item represents; when that resource is at its cap, `upgrade` is set. */
  upgradeResource?: PlanLimitResource;
  /** Override the default org-nav-* test id derived from `path`. */
  testId?: string;
  group?: string | null; // Group label key for sidebar grouping
  /** Keep in search/breadcrumbs but do not render in the org sidebar. */
  hideFromSidebar?: boolean;
  /** When set, the org sidebar shows the matching total from org nav counts. */
  countKey?: OrgNavCountKey;
  /** Show a "New" badge on the org sidebar. */
  isNew?: boolean;
}

export interface NavGroup {
  labelKey: string | null;
  items: NavItem[];
}

export interface NestedRouteConfig {
  path: string; // Relative to parent (e.g., 'ask', 'customize-lms')
  titleKey: string; // Translation key or plain text
}

/** Stable sidebar nav hook from a route path segment (locale-independent). */
export function orgNavTestId(path: string): string {
  if (!path) {
    return 'org-nav-home';
  }

  const slug = path.replace(/^\//, '').replace(/\//g, '-');
  return `org-nav-${slug}`;
}

function resolveNavTestId(path: string, testId?: string): string {
  return testId ?? orgNavTestId(path);
}

// Base navigation configuration structure
export const baseNavConfig: NavItemConfig[] = [
  {
    group: null,
    titleKey: 'org_navigation.dashboard',
    path: '/dash',
    icon: LayoutDashboardIcon,
    matchPattern: '^/org/[^/]+/dash(/.*)?$'
  },
  {
    group: 'content',
    titleKey: 'org_navigation.courses',
    path: '/courses',
    icon: BookOpenIcon,
    countKey: 'courses',
    matchPattern: '^/org/[^/]+/courses(/.*)?$',
    nestedRoutes: [{ titleKey: 'course_templates.gallery.title', path: 'templates' }]
  },
  {
    group: 'content',
    titleKey: 'org_navigation.ai_studio',
    path: '',
    icon: SparklesIcon,
    matchPattern: '^/org/[^/]+/?$'
  },
  {
    group: 'content',
    titleKey: 'org_navigation.media',
    path: '/media',
    icon: FolderOpenIcon,
    countKey: 'media',
    matchPattern: '^/org/[^/]+/media(/.*)?$'
  },
  {
    group: 'content',
    titleKey: 'org_navigation.tags',
    path: '/tags',
    icon: TagsIcon,
    countKey: 'tags',
    matchPattern: '^/org/[^/]+/tags(/.*)?$'
  },
  {
    group: 'people',
    titleKey: 'employees.title',
    path: '/employees',
    icon: ContactRoundIcon,
    matchPattern: '^/org/[^/]+/employees(/.*)?$'
  },
  {
    group: 'people',
    titleKey: 'org_navigation.community',
    path: '/community',
    icon: MessagesSquareIcon,
    supportsDynamicSegment: true,
    matchPattern: '^/org/[^/]+/community(/.*)?$',
    nestedRoutes: [
      {
        path: 'ask',
        titleKey: 'community.ask.ask_the'
      }
    ]
  },
  {
    group: 'reports',
    titleKey: 'org_navigation.analytics',
    path: '/analytics',
    icon: ChartColumnIcon,
    matchPattern: '^/org/[^/]+/analytics(/.*)?$'
  },
  {
    group: 'system',
    titleKey: 'org_navigation.automation',
    path: '/automation/mcp',
    icon: PlugIcon,
    requiresAdmin: true,
    matchPattern: '^/org/[^/]+/(automation|mcp|api|zapier)(/.*)?$',
    nestedRoutes: [
      { path: 'mcp', titleKey: 'automation.tabs.mcp' },
      { path: 'api', titleKey: 'automation.tabs.api' },
      { path: 'webhooks', titleKey: 'automation.tabs.webhooks' }
    ]
  },
  {
    group: 'system',
    titleKey: 'org_navigation.settings',
    path: '/settings',
    icon: SettingsIcon,
    matchPattern: '^/org/[^/]+/settings(/.*)?$',
    nestedRoutes: [
      {
        path: 'notifications',
        titleKey: 'settings.tabs.notifications_tab'
      },
      {
        path: 'ai',
        titleKey: 'settings.tabs.ai_tab'
      },
      {
        path: 'ai-tutor',
        titleKey: 'settings.tabs.ai_tutor_tab'
      },
      {
        path: 'auth',
        titleKey: 'settings.tabs.auth_tab'
      },
      {
        path: 'auth/sso',
        titleKey: 'settings.tabs.sso_tab'
      },
      {
        path: 'auth/token-auth',
        titleKey: 'settings.tabs.token_auth_tab'
      }
    ]
  }
];

function isAiSettingsPath(path: string | undefined): boolean {
  if (!path) return false;

  return path.includes('ai-tutor');
}

function isHomePath(path: string): boolean {
  return path === '';
}

/**
 * Nav config with the Home item and AI-related settings tabs removed when AI is turned off.
 */
function resolveNavConfig(aiEnabled: boolean): NavItemConfig[] {
  if (aiEnabled) return baseNavConfig;

  return baseNavConfig
    .filter((config) => !isHomePath(config.path))
    .map((config) => ({
      ...config,
      items: config.items?.filter((sub) => !isAiSettingsPath(sub.path)),
      nestedRoutes: config.nestedRoutes?.filter((route) => !isAiSettingsPath(route.path))
    }));
}

/**
 * Get navigation items based on organization context and permissions
 */
export function getOrgNavigationItems(
  currentOrgPath: string,
  currentOrg: AccountOrg,
  isOrgAdmin: boolean | null,
  t: (key: string) => string,
  pagePathname: string,
  aiEnabled: boolean
): NavItem[] {
  const items: NavItem[] = [];

  for (const config of resolveNavConfig(aiEnabled)) {
    // Skip admin-only items if user is not admin
    if (config.requiresAdmin && !isOrgAdmin && !config.disableWhenNotAdmin) {
      continue;
    }

    const visibleSubConfigs = config.items?.filter((sub) => !sub.requiresAdmin || isOrgAdmin) ?? [];

    if (config.items && visibleSubConfigs.length === 0) {
      continue;
    }

    const url = config.path === '' ? currentOrgPath : `${currentOrgPath}${config.path}`;
    const fullPath = config.path === '' ? `/org/${currentOrg.siteName}` : `/org/${currentOrg.siteName}${config.path}`;

    // Extract match pattern (handle function case)
    const matchPattern =
      typeof config.matchPattern === 'function' ? config.matchPattern(currentOrg.siteName!) : config.matchPattern;

    const item: NavItem = {
      title: t(config.titleKey),
      url: config.useHashUrl ? '#' : url,
      path: config.path, // Store actual path for breadcrumb generation
      testId: resolveNavTestId(config.path, config.testId),
      icon: config.icon,
      matchPattern,
      isActive: isActive(pagePathname, fullPath, matchPattern),
      isExpanded: config.items ? isActive(pagePathname, fullPath, matchPattern) : undefined,
      disabled: Boolean(config.disableWhenNotAdmin && !isOrgAdmin),
      useHashUrl: config.useHashUrl,
      nestedRoutes: config.nestedRoutes,
      supportsDynamicSegment: config.supportsDynamicSegment,
      isPaid: config.isPaid,
      isNew: config.isNew
    };

    // Handle nested items (like settings sub-items)
    if (visibleSubConfigs.length > 0) {
      item.items = visibleSubConfigs.map((subConfig) => {
        const subMatchPattern =
          typeof subConfig.matchPattern === 'function'
            ? subConfig.matchPattern(currentOrg.siteName!)
            : subConfig.matchPattern;
        const subUrl = `${currentOrgPath}${subConfig.path}`;

        return {
          title: t(subConfig.titleKey),
          isActive: isActive(pagePathname, subUrl, subMatchPattern, true),
          url: subUrl,
          path: subConfig.path,
          testId: resolveNavTestId(subConfig.path, subConfig.testId),
          matchPattern: subMatchPattern,
          isPaid: subConfig.isPaid,
          nestedRoutes: subConfig.nestedRoutes
        };
      });
    }

    items.push(item);
  }

  return items;
}

const GROUP_ORDER: Array<{ key: string | null; labelKey: string | null }> = [
  { key: null, labelKey: null },
  { key: 'content', labelKey: 'org_navigation.content' },
  { key: 'people', labelKey: 'org_navigation.people' },
  { key: 'reports', labelKey: 'org_navigation.reports' },
  { key: 'system', labelKey: 'org_navigation.system' }
];

/**
 * Get navigation items grouped for the sidebar
 */
export function getOrgNavigationGroups(
  currentOrgPath: string,
  currentOrg: AccountOrg,
  isOrgAdmin: boolean | null,
  t: (key: string) => string,
  pagePathname: string,
  limitsReached: Partial<Record<PlanLimitResource, boolean>> = {},
  counts: OrgNavCounts | null = null,
  aiEnabled = false
): NavGroup[] {
  const pathnameOnly = pagePathname.split('?')[0];
  const groupedMap = new Map<string | null, NavItem[]>();

  for (const groupDef of GROUP_ORDER) {
    groupedMap.set(groupDef.key, []);
  }

  for (const config of resolveNavConfig(aiEnabled)) {
    if (config.hideFromSidebar) {
      continue;
    }

    if (config.requiresAdmin && !isOrgAdmin && !config.disableWhenNotAdmin) {
      continue;
    }

    const visibleSubConfigs = config.items?.filter((sub) => !sub.requiresAdmin || isOrgAdmin) ?? [];

    if (config.items && visibleSubConfigs.length === 0) {
      continue;
    }

    const url = config.path === '' ? currentOrgPath : `${currentOrgPath}${config.path}`;
    const fullPath = config.path === '' ? `/org/${currentOrg.siteName}` : `/org/${currentOrg.siteName}${config.path}`;
    const matchPattern =
      typeof config.matchPattern === 'function' ? config.matchPattern(currentOrg.siteName!) : config.matchPattern;

    const item: NavItem = {
      title: t(config.titleKey),
      url: config.useHashUrl ? '#' : url,
      path: config.path,
      testId: resolveNavTestId(config.path, config.testId),
      icon: config.icon,
      matchPattern,
      isActive: isActive(pathnameOnly, fullPath, matchPattern),
      isExpanded: config.items ? isActive(pathnameOnly, fullPath, matchPattern) : undefined,
      disabled: Boolean(config.disableWhenNotAdmin && !isOrgAdmin),
      useHashUrl: config.useHashUrl,
      nestedRoutes: config.nestedRoutes,
      supportsDynamicSegment: config.supportsDynamicSegment,
      isPaid: config.isPaid,
      upgrade: config.upgradeResource ? Boolean(limitsReached[config.upgradeResource]) : undefined,
      count: config.countKey && counts ? counts[config.countKey] : undefined,
      isNew: config.isNew
    };

    if (visibleSubConfigs.length > 0) {
      item.items = visibleSubConfigs.map((subConfig) => {
        const subMatchPattern =
          typeof subConfig.matchPattern === 'function'
            ? subConfig.matchPattern(currentOrg.siteName!)
            : subConfig.matchPattern;
        const subUrl = `${currentOrgPath}${subConfig.path}`;
        return {
          title: t(subConfig.titleKey),
          isActive: isActive(pathnameOnly, subUrl, subMatchPattern, true),
          url: subUrl,
          path: subConfig.path,
          testId: resolveNavTestId(subConfig.path, subConfig.testId),
          matchPattern: subMatchPattern,
          isPaid: subConfig.isPaid,
          nestedRoutes: subConfig.nestedRoutes
        };
      });
    }

    const groupKey = config.group !== undefined ? config.group : null;
    const bucket = groupedMap.get(groupKey) ?? groupedMap.get(null)!;
    bucket.push(item);
  }

  return GROUP_ORDER.filter(({ key }) => (groupedMap.get(key) ?? []).length > 0).map(({ key, labelKey }) => ({
    labelKey,
    items: groupedMap.get(key) ?? []
  }));
}
