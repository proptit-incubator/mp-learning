<script lang="ts">
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { BRAND } from '$lib/utils/constants/brand';
  import { basePath } from '$lib/utils/store/app';
  import { t } from '$lib/utils/functions/translations';
  import { currentOrgPath, isOrgTeamMember } from '$lib/utils/store/org';
  import ArrowLeftRightIcon from '@lucide/svelte/icons/arrow-left-right';

  interface Props {
    context: 'admin' | 'learner';
  }

  let { context }: Props = $props();

  const contextLabel = $derived(
    context === 'admin' ? $t('mp_learning.context_admin') : $t('mp_learning.context_learner')
  );
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <Sidebar.MenuButton size="lg" tooltipContent={BRAND.product} class="ui:hover:bg-sidebar-accent gap-3">
      {#snippet child({ props })}
        <a href={$basePath || '/dash'} {...props}>
          <span
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-white shadow-[0_1px_0_rgb(255_255_255/40%)_inset,0_4px_12px_-4px_rgb(0_0_0/45%)] group-data-[collapsible=icon]:size-8"
          >
            <img src={BRAND.mark} alt="" class="size-7 object-contain group-data-[collapsible=icon]:size-6" />
          </span>
          <span class="grid min-w-0 leading-tight">
            <span class="ui:text-sidebar-accent-foreground truncate text-[15px] font-semibold tracking-tight">
              {BRAND.product}
            </span>
            <span class="ui:text-sidebar-muted truncate text-[11px] font-medium">{contextLabel}</span>
          </span>
        </a>
      {/snippet}
    </Sidebar.MenuButton>
  </Sidebar.MenuItem>
  {#if context === 'admin' || $isOrgTeamMember}
    <Sidebar.MenuItem class="mt-3">
      <Sidebar.MenuButton
        tooltipContent={$t(context === 'admin' ? 'mp_learning.switch_to_learner' : 'mp_learning.switch_to_admin')}
        class="border border-white/15 bg-white/5"
      >
        {#snippet child({ props })}
          <a href={context === 'admin' ? '/lms' : `${$currentOrgPath}/dash`} {...props}>
            <ArrowLeftRightIcon class="custom size-4" />
            <span class="text-xs"
              >{$t(context === 'admin' ? 'mp_learning.context_learner' : 'mp_learning.context_admin')}</span
            >
          </a>
        {/snippet}
      </Sidebar.MenuButton>
    </Sidebar.MenuItem>
  {/if}
</Sidebar.Menu>
