import { BaseApi, classroomio } from '$lib/utils/services/api';
import { currentOrg, getAppOrigin, mergeAccountOrgFromServer, orgs } from '$lib/utils/store/org';
import { defaultProfileState, defaultUserState, profile, user } from '$lib/utils/store/user';

import type { AccountResponse, AccountSuccess } from './types';
import type { AppOrgParams as AppSetupParams } from './resolve-app-org-params';
import type { PendingOrgInvite } from '$features/lms/utils/types';
import type { TUser } from '@cio/db/types';
import { authClient } from '$lib/utils/services/auth/client';
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { activateLocale, handleLocaleChange } from '$lib/utils/functions/translations';
import { isOrgStudent, globalStore } from '$lib/utils/store/app';
import { isPublicRoute } from '$lib/utils/functions/routes/isPublicRoute';
import { licenseApi } from '$features/license/api/license.svelte';
import { aiConfigured } from '$lib/utils/store/ai';
import { logout } from '$lib/utils/functions/logout';
import { page } from '$app/state';
import { resolve } from '$app/paths';
import { setSentryUser } from '$lib/utils/services/sentry';
import { setTheme } from '$lib/utils/functions/theme';
import shouldRedirectOnAuth from '$lib/utils/functions/routes/shouldRedirectOnAuth';

function tenantSyncKey(params: AppSetupParams): string | null {
  if (!params.orgSiteName) {
    return null;
  }

  if (params.isOrgSite) {
    return `tenant:${params.orgSiteName}:${params.orgId ?? ''}`;
  }

  return `admin:${params.orgSiteName}`;
}

/*
  Manages everything related to loading the logged in user and setting up the organization.
*/
class AppInitApi extends BaseApi {
  data = $state<AccountResponse>(null);
  session = $state<App.Locals | null>(null);
  pendingOrgInvite = $state<PendingOrgInvite | null>(null);
  showPendingInviteModal = $state(false);
  private syncedTenantKey: string | null = null;

  get loading() {
    return this.isLoading;
  }

  async setupApp(locals: App.Locals, params: AppSetupParams): Promise<boolean | undefined> {
    if (this.isLoading || this.isInitializedAndReady) {
      return;
    }

    this.isLoading = true;

    try {
      if (!locals.user) {
        if (!params.isOrgSite) {
          goto(resolve('/login', {}));
          return false;
        }

        console.log('No user found in locals');
        return;
      }

      this.session = locals;

      const needsTenantMembership = params.isOrgSite && params.orgId && !this.isMemberOfOrg(locals, params.orgId);

      if (needsTenantMembership && params.orgId) {
        const orgId = params.orgId;
        const [pendingInvite, accountData] = await Promise.all([
          this.fetchPendingOrgInvite(orgId),
          this.fetchAccountData()
        ]);

        if (!accountData) {
          return false;
        }

        if (pendingInvite) {
          this.showPendingOrgInvite(pendingInvite);
        }

        this.applyAccountData(accountData, params);
        return;
      }

      const accountData = await this.fetchAccountData();
      if (accountData) {
        this.applyAccountData(accountData, params);
      }
    } finally {
      if (!this.isInitializedAndReady) {
        this.isLoading = false;
      }
    }
  }

  /**
   * Whether the current session already reflects membership in `orgId`.
   * Better Auth's `customSession` attaches an `orgRoles` map ({ orgId: roleId })
   * that RBAC middlewares also use, so a present key means the user is a member.
   */
  private isMemberOfOrg(locals: App.Locals, orgId: string): boolean {
    const orgRoles = (locals as { orgRoles?: Record<string, number> }).orgRoles;

    return !!orgRoles && orgId in orgRoles;
  }

  private applyAccountData(accountData: AccountSuccess, params: AppSetupParams) {
    this.resetErrors();
    this.success = true;
    this.data = accountData;
    this.setupStores(params);
    licenseApi.syncFromAccount(accountData.licenseFeatures, get(currentOrg));
    aiConfigured.set(accountData.aiConfigured);
    this.setUserAnalytics();
    this.routeUserToNextPage(params);
  }

  private async fetchAccountData(): Promise<AccountSuccess | undefined> {
    try {
      const response = await classroomio.account.$get();
      const result = (await response.json()) as AccountResponse;

      if (!result?.success) {
        this.error = JSON.stringify(result);
        logout();
        return undefined;
      }

      const instanceOrganization = result.organizations[0];
      if (instanceOrganization && this.session && !this.isMemberOfOrg(this.session, instanceOrganization.id)) {
        await authClient.getSession({ query: { disableCookieCache: true } });
      }

      return result;
    } catch (error) {
      console.error('Error fetching account:', error);
      this.error = error instanceof Error ? error.message : 'Error fetching account';
      logout();
      return undefined;
    }
  }

  private showPendingOrgInvite(pendingInvite: PendingOrgInvite) {
    this.pendingOrgInvite = pendingInvite;
    this.showPendingInviteModal = true;
  }

  private async fetchPendingOrgInvite(orgId: string): Promise<PendingOrgInvite | null> {
    try {
      const response = await classroomio.invite.organization.pending.$get({}, { headers: { 'cio-org-id': orgId } });
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
    } catch (error) {
      console.warn('pending org invite check failed', error);
    }

    return null;
  }

  /**
   * Re-pin org context after setupApp when the URL org changes.
   *
   * setupApp only runs once per session; tenant subdomains and `/org/[slug]`
   * routes can change without another /account fetch. This keeps `currentOrg`
   * aligned with the URL and surfaces pending invitations when needed.
   */
  async syncOrgContext(params: AppSetupParams): Promise<void> {
    if (!this.data?.success || !params.orgSiteName) {
      return;
    }

    const nextTenantKey = tenantSyncKey(params);
    if (nextTenantKey && nextTenantKey === this.syncedTenantKey) {
      return;
    }

    const isMember = this.data.organizations.some((org) => org.siteName === params.orgSiteName);
    if (params.isOrgSite && params.orgId && !isMember) {
      const pendingInvite = await this.fetchPendingOrgInvite(params.orgId);
      if (pendingInvite) {
        this.showPendingOrgInvite(pendingInvite);
      }
    }

    this.setOrgStore(params);
    licenseApi.syncFromAccount(this.data.licenseFeatures, get(currentOrg));
    aiConfigured.set(this.data.aiConfigured);
  }

  /*
    1. Update user store
    2. Update profile store
    3. Update organizations store
  */
  setupStores(params?: AppSetupParams) {
    if (!this.data?.success || !this.session) {
      return;
    }

    user.update((_user) => ({
      ..._user,
      fetchingUser: false,
      isLoggedIn: true,
      currentSession: (this.session?.user as unknown as TUser) || undefined
    }));

    profile.set(this.data.profile);
    const orgSite = params?.isOrgSite
      ? this.data.organizations.find((org) => org.id === params.orgId || org.siteName === params.orgSiteName)
      : undefined;
    const enforcedLocale = orgSite?.settings?.language?.enforced
      ? orgSite.settings.language.locale
      : params?.orgLocaleEnforced
        ? params.orgLocale
        : undefined;
    if (enforcedLocale) {
      activateLocale(enforcedLocale);
    } else {
      handleLocaleChange(this.data.profile.locale ?? params?.orgLocale);
    }

    this.setOrgStore(params);
  }

  setOrgStore(params?: AppSetupParams) {
    if (!this.data?.success || !this.data) {
      return;
    }

    orgs.set(this.data.organizations.map((org) => mergeAccountOrgFromServer(org)));

    const nextOrg = this.pickCurrentOrg();
    if (!nextOrg) {
      return;
    }

    currentOrg.set(mergeAccountOrgFromServer(nextOrg));

    localStorage.removeItem('classroomio_org_sitename');

    const theme = get(currentOrg)?.theme;

    setTheme(theme || 'blue');
    this.syncedTenantKey = tenantSyncKey(params ?? { isOrgSite: false, orgSiteName: '' });
  }

  private pickCurrentOrg() {
    return this.data?.success ? this.data.organizations[0] : undefined;
  }

  routeUserToNextPage(_params: AppSetupParams) {
    if (!this.data?.success) return;

    const path = window.location.pathname;
    if (this.pendingOrgInvite) return;

    if (!this.data.organizations.length) {
      if (!isPublicRoute(path) || shouldRedirectOnAuth(path)) {
        goto('/auth-failed?error=access');
      }

      return;
    }

    const redirect = page.url.searchParams.get('redirect');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) {
      window.location.href = redirect;
      return;
    }

    if (!shouldRedirectOnAuth(path)) return;

    return get(isOrgStudent) ? this.goToLMS(true) : this.goToOrg();
  }

  goToLMS(_isOrgSite: boolean) {
    goto(resolve('/lms', {}));
  }

  goToOrg() {
    const selectedOrg = get(currentOrg);
    if (!selectedOrg.siteName) return;

    goto(resolve(`/org/${selectedOrg.siteName}/dash`, {}), { invalidateAll: true });
  }

  setUserAnalytics() {
    const profileStore = get(profile);

    if (!profileStore?.id) return;

    setSentryUser({
      id: profileStore.id,
      username: profileStore.username,
      email: profileStore.email,
      fullname: profileStore.fullname
    });
  }

  /**
   * Re-fetches the account and re-seeds the stores, e.g. after a plan is connected to the organization.
   */
  async refreshAccountData(): Promise<void> {
    const accountData = await this.fetchAccountData();

    if (!accountData) return;

    this.data = accountData;
    this.setupStores();
  }

  async handlePendingInviteAccepted(redirectTo?: string): Promise<void> {
    this.showPendingInviteModal = false;
    this.pendingOrgInvite = null;

    await authClient.getSession({ query: { disableCookieCache: true } });

    const response = await classroomio.account.$get();
    const accountData = (await response.json()) as AccountResponse;
    if (accountData?.success) {
      this.data = accountData;
      this.setupStores();
    }

    const isOnOrgSite = get(globalStore).isOrgSite;
    if (redirectTo?.startsWith('/org/') && isOnOrgSite) {
      window.location.href = `${getAppOrigin()}${redirectTo}`;
      return;
    }

    if (redirectTo) {
      window.location.href = redirectTo;
      return;
    }

    window.location.reload();
  }

  reset() {
    super.reset();
    this.data = null;
    this.syncedTenantKey = null;
    this.pendingOrgInvite = null;
    this.showPendingInviteModal = false;
    licenseApi.reset();

    user.set(defaultUserState);
    profile.set(defaultProfileState);
  }

  get isInitializedAndReady() {
    return !this.isLoading && !this.error && this.data !== null;
  }
}

export const appInitApi = new AppInitApi();
