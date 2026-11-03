import { browser } from '$app/environment';
import { derived, writable } from 'svelte/store';
import merge from 'lodash/merge';

import type { AccountOrg, PublicOrg } from '$features/app/types';
import type { OrgTeamMember } from '../types/org';
import {
  canUseBasicAuthSettings,
  canUsePublicApi,
  getActiveOrgPlan,
  getStudentLimit,
  isOrgOnFreePlan,
  isResourceLimitReached,
  PLAN
} from '@cio/utils/plans';
import { PUBLIC_IS_SELFHOSTED } from '$env/static/public';
import { MP_LEARNING, ROLE } from '@cio/utils/constants';
import type { Writable } from 'svelte/store';

/** Deep-merge with this when hydrating an org from the API so nested `customization` keys stay stable. */
export const DEFAULT_ORG_CUSTOMIZATION = {
  apps: { poll: true, comments: true },
  course: { grading: true, newsfeed: true },
  dashboard: { exercise: true, community: true, bannerText: '', bannerImage: '' },
  auth: { backgroundImage: '' }
} as NonNullable<AccountOrg['customization']>;

export function mergeAccountOrgFromServer(org: AccountOrg | PublicOrg): AccountOrg {
  const plans = org.plans.map((plan) => ({
    provider: null,
    subscriptionId: null,
    customerId: null,
    ...plan
  }));

  return {
    ...org,
    name: MP_LEARNING.name,
    avatarUrl: MP_LEARNING.logo,
    theme: MP_LEARNING.theme,
    plans,
    customization: merge({}, DEFAULT_ORG_CUSTOMIZATION, org.customization ?? {}) as AccountOrg['customization']
  } as AccountOrg;
}

export const orgs = writable<AccountOrg[]>([]);

export const currentOrg: Writable<AccountOrg> = writable({
  avatarUrl: '',
  createdAt: '',
  customCode: '',
  customDomain: '',
  customization: {
    ...DEFAULT_ORG_CUSTOMIZATION
  },
  disableEmailPassword: false,
  disableGoogleAuth: false,
  disableSignup: false,
  disableSignupMessage: '',
  favicon: '',
  id: '',
  isCustomDomainVerified: false,
  isRestricted: false,
  landingpage: {},
  name: '',
  parentOrganizationId: null,
  plans: [],
  readOnlyUntil: null,
  memberId: 0,
  roleId: 0,
  settings: {},
  siteName: '',
  theme: ''
});

export const isSecondaryWorkspace = derived(currentOrg, ($currentOrg) => Boolean($currentOrg.parentOrganizationId));

export const isPrimaryWorkspace = derived(
  currentOrg,
  ($currentOrg) => Boolean($currentOrg.id) && !$currentOrg.parentOrganizationId
);
export const orgTeam = writable<OrgTeamMember[]>([]);
export const isOrgAdmin = derived(currentOrg, ($currentOrg) => {
  if ($currentOrg.roleId === 0) return null;

  return $currentOrg.roleId === ROLE.ADMIN;
});

/** True when the user can manage an org (admin dashboard), not a student-only member. */
export function isOrgManagerRole(roleId: number): boolean {
  return roleId === ROLE.ADMIN || roleId === ROLE.TUTOR;
}

/** Orgs where the user is ADMIN or TUTOR — eligible for the admin org switcher. */
export const managedOrgs = derived(orgs, ($orgs) => $orgs.filter((org) => isOrgManagerRole(org.roleId)));

export const isOrgTeamMember = derived(currentOrg, ($currentOrg) => {
  if ($currentOrg.roleId === 0) return null;

  return isOrgManagerRole($currentOrg.roleId);
});

export const currentOrgPlan = derived(currentOrg, ($currentOrg) => getActiveOrgPlan($currentOrg.plans));

export const currentOrgPath = derived(currentOrg, ($currentOrg) =>
  $currentOrg.siteName ? `/org/${$currentOrg.siteName}` : '#'
);

type OrgPublicOrigin = Pick<AccountOrg, 'customDomain' | 'isCustomDomainVerified' | 'siteName'>;

export function getAppOrigin(): string {
  return browser ? window.location.origin : '';
}

export function getOrgPublicOrigin(_org: OrgPublicOrigin): string {
  return getAppOrigin();
}

export function getOrgPublicUrl(_org: OrgPublicOrigin, pathname = '/'): string {
  if (!browser) return pathname;

  return new URL(pathname, window.location.origin).toString();
}

export const currentOrgDomain = derived(currentOrg, ($currentOrg) => getOrgPublicOrigin($currentOrg));

export const isFreePlan = derived(currentOrg, ($currentOrg) =>
  isOrgOnFreePlan({
    plans: $currentOrg.plans,
    isSelfHosted: PUBLIC_IS_SELFHOSTED === 'true',
    orgId: $currentOrg.id
  })
);

export const isEnterprisePlan = derived(currentOrg, ($currentOrg) => {
  if (PUBLIC_IS_SELFHOSTED === 'true') return true;

  const plan = getActiveOrgPlan($currentOrg.plans);

  return plan?.planName === PLAN.ENTERPRISE;
});

export const hasPublicApiAccess = derived(currentOrg, ($currentOrg) => {
  const plan = getActiveOrgPlan($currentOrg.plans);

  return canUsePublicApi(plan?.planName, PUBLIC_IS_SELFHOSTED === 'true');
});

export const hasBasicAuthSettingsAccess = derived(currentOrg, ($currentOrg) => {
  const plan = getActiveOrgPlan($currentOrg.plans);

  return canUseBasicAuthSettings(plan?.planName, PUBLIC_IS_SELFHOSTED === 'true');
});

export const currentOrgMaxAudience = derived(currentOrgPlan, ($plan) => {
  const limit = getStudentLimit($plan?.planName);
  return Number.isFinite(limit) ? limit : Number.MAX_SAFE_INTEGER;
});

/**
 * Per-resource org usage + limits delivered by `/account` (admin/tutor only).
 * `studentUsage`/`isStudentLimitReached` are convenience selectors; generic
 * consumers can read `$currentOrgLimits.<resource>` with `isResourceLimitReached`.
 */
export const currentOrgLimits = derived(currentOrg, ($currentOrg) => $currentOrg.limits ?? {});

export const studentUsage = derived(currentOrg, ($currentOrg) => $currentOrg.limits?.students);

export const isStudentLimitReached = derived(currentOrg, ($currentOrg) =>
  isResourceLimitReached($currentOrg.limits?.students)
);
