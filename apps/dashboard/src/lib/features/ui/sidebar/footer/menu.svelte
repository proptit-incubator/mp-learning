<script lang="ts">
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { basePath, isOrgStudent } from '$lib/utils/store/app';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { useSidebar } from '@cio/ui/base/sidebar';
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import BellIcon from '@lucide/svelte/icons/bell';
  import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
  import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
  import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
  import LifeBuoyIcon from '@lucide/svelte/icons/life-buoy';
  import LogOutIcon from '@lucide/svelte/icons/log-out';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';
  import ThemeToggle from './theme-toggle.svelte';

  import { t } from '$lib/utils/functions/translations';
  import { profile } from '$lib/utils/store/user';
  import { currentOrg } from '$lib/utils/store/org';
  import { ROLE } from '@cio/utils/constants';

  const sidebar = useSidebar();

  const isInLearnerSpace = $derived(page.url.pathname.startsWith('/lms'));
  const canSwitchSpace = $derived($isOrgStudent === false && !!$currentOrg.siteName);
  const switchSpaceHref = $derived(isInLearnerSpace ? '/dash' : '/lms');
  const accountBasePath = $derived(isInLearnerSpace ? '/lms' : $basePath);

  function getRoleLabel(roleId: number): string {
    if (roleId === ROLE.ADMIN) return $t('course.navItem.people.roles.admin');
    if (roleId === ROLE.TUTOR) return $t('course.navItem.people.roles.tutor');
    if (roleId === ROLE.STUDENT) return $t('course.navItem.people.roles.student');
    return '';
  }
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            data-testid="app-user-menu-trigger"
            class="ui:data-[state=open]:bg-sidebar-accent ui:data-[state=open]:text-sidebar-accent-foreground gap-3"
            {...props}
          >
            <UserAvatar src={$profile.avatarUrl} alt={$profile.fullname} />
            <div class="grid flex-1 text-left leading-tight">
              <span class="ui:text-sidebar-accent-foreground truncate text-sm font-medium">{$profile.fullname}</span>
              <span class="ui:text-sidebar-muted truncate text-xs">{getRoleLabel($currentOrg.roleId)}</span>
            </div>
            <ChevronsUpDownIcon class="custom ui:text-sidebar-muted ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-64 rounded-xl p-1.5"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        align="end"
        sideOffset={8}
      >
        <DropdownMenu.Label class="flex items-center gap-3 px-2 py-2 font-normal">
          <UserAvatar src={$profile.avatarUrl} alt={$profile.fullname} />
          <div class="grid min-w-0 flex-1 leading-tight">
            <span class="truncate text-sm font-semibold">{$profile.fullname}</span>
            <span class="ui:text-muted-foreground truncate text-xs">{$profile.email}</span>
          </div>
        </DropdownMenu.Label>

        <DropdownMenu.Separator />

        <DropdownMenu.Item onclick={() => goto(resolve(`${accountBasePath}/settings`, {}))}>
          <UserRoundIcon class="size-4" />
          {$t('settings.tabs.profile_tab')}
        </DropdownMenu.Item>
        <DropdownMenu.Item onclick={() => goto(resolve(`${accountBasePath}/settings/notifications`, {}))}>
          <BellIcon class="size-4" />
          {$t('settings.tabs.notifications_tab')}
        </DropdownMenu.Item>

        {#if canSwitchSpace}
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => goto(resolve(switchSpaceHref, {}))}>
            {#if isInLearnerSpace}
              <LayoutDashboardIcon class="size-4" />
              {$t('mp_learning.switch_to_admin')}
            {:else}
              <GraduationCapIcon class="size-4" />
              {$t('mp_learning.switch_to_learner')}
            {/if}
          </DropdownMenu.Item>
        {/if}

        <DropdownMenu.Separator />
        <DropdownMenu.Item onclick={() => window.open('/help', '_blank', 'noopener')}>
          <LifeBuoyIcon class="size-4" />
          {$t('mp_learning.help_center')}
        </DropdownMenu.Item>

        <DropdownMenu.Separator />
        <DropdownMenu.Label class="ui:py-0 font-normal">
          <ThemeToggle />
        </DropdownMenu.Label>
        <DropdownMenu.Separator />

        <DropdownMenu.Item onclick={() => goto(resolve(`/logout`, {}))}>
          <LogOutIcon class="size-4" />
          {$t('settings.profile.logout')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
