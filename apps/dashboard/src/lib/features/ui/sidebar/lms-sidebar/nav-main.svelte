<script lang="ts">
  import { currentOrg } from '$lib/utils/store/org';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { t } from '$lib/utils/functions/translations';
  import { page } from '$app/state';
  import { getLmsNavigationItems } from '$features/ui/navigation/lms-navigation';
  import { employeesApi } from '$features/employees/api/employees.svelte';
  import { untrack } from 'svelte';
  import UsersRoundIcon from '@lucide/svelte/icons/users-round';
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';

  $effect(() => {
    const orgId = $currentOrg.id;
    if (!orgId) return;

    untrack(() => {
      void employeesApi.loadAccess(orgId);
    });
  });

  const access = $derived(employeesApi.access);
  const canSeeEmployees = $derived(
    Boolean(access && (access.canManagePeople || access.canAssignTraining || access.isManager))
  );
  const canSeeLearningReport = $derived(
    Boolean(access && (access.canViewOrgReports || access.isManager || access.teachesCourses))
  );

  const items = $derived(
    getLmsNavigationItems($currentOrg, $t, page.url.pathname).filter((item) => !item.hideFromSidebar)
  );
</script>

<Sidebar.Group class="py-1!">
  <Sidebar.GroupLabel>{$t('lms_navigation.group_learning')}</Sidebar.GroupLabel>
  <Sidebar.Menu class="gap-0.5">
    {#each items as item (item.path)}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
          {#snippet child({ props })}
            <a href={item.url} {...props}>
              {#if item.icon}
                {@const Icon = item.icon}
                <Icon size={17} strokeWidth={1.75} class="custom" />
              {/if}
              <span>{item.title}</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    {/each}
    {#if canSeeEmployees}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent={$t('employees.title')} isActive={page.url.pathname === '/lms/employees'}>
          {#snippet child({ props })}
            <a href="/lms/employees" {...props} data-testid="employee-navigation"
              ><UsersRoundIcon size={17} /><span>{$t('employees.title')}</span></a
            >
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    {/if}
    {#if canSeeLearningReport}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton
          tooltipContent={$t('learning_analytics.title')}
          isActive={page.url.pathname === '/lms/analytics'}
        >
          {#snippet child({ props })}
            <a href="/lms/analytics" {...props} data-testid="learning-report-navigation"
              ><ChartColumnIcon size={17} /><span>{$t('learning_analytics.title')}</span></a
            >
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    {/if}
  </Sidebar.Menu>
</Sidebar.Group>
