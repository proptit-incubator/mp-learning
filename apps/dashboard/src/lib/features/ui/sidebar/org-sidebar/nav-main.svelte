<script lang="ts">
  import { currentOrgPath, currentOrg, isOrgAdmin } from '$lib/utils/store/org';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { t } from '$lib/utils/functions/translations';
  import { page } from '$app/state';
  import { getOrgNavigationGroups } from '$features/ui/navigation/org-navigation';
  import { formatCompactCount } from '@cio/utils/functions';
  import { orgNavCountsApi } from './org-nav-counts.svelte';
  import { aiEnabled } from '$lib/utils/store/ai';

  const groups = $derived(
    getOrgNavigationGroups(
      $currentOrgPath,
      $currentOrg,
      $isOrgAdmin,
      $t,
      page.url.pathname + page.url.search,
      {},
      orgNavCountsApi.counts,
      $aiEnabled === true
    )
  );
</script>

{#each groups as group (group.labelKey)}
  <Sidebar.Group class="py-1!">
    {#if group.labelKey}
      <Sidebar.GroupLabel>{$t(group.labelKey)}</Sidebar.GroupLabel>
    {/if}
    <Sidebar.Menu class="gap-0.5">
      {#each group.items as item (item.testId)}
        <Sidebar.MenuItem>
          <Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
            {#snippet child({ props })}
              <a href={item.url} {...props} data-testid={item.testId}>
                {#if item.icon}
                  {@const Icon = item.icon}
                  <Icon size={17} strokeWidth={1.75} class="custom" />
                {/if}
                <span>{item.title}</span>
                {#if item.count}
                  <Sidebar.MenuBadge>{formatCompactCount(item.count)}</Sidebar.MenuBadge>
                {/if}
              </a>
            {/snippet}
          </Sidebar.MenuButton>
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  </Sidebar.Group>
{/each}
