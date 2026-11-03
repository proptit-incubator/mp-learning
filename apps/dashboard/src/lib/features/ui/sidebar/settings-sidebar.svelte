<script lang="ts">
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { currentOrgPath, isOrgAdmin } from '$lib/utils/store/org';
  import { page } from '$app/state';
  import { t } from '$lib/utils/functions/translations';
  import { aiConfigured, aiEnabled } from '$lib/utils/store/ai';
  import Search from '$features/ui/search.svelte';
  import { isActive } from '$lib/utils/functions/app';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import BellIcon from '@lucide/svelte/icons/bell';
  import BotIcon from '@lucide/svelte/icons/bot';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import MailIcon from '@lucide/svelte/icons/mail';
  import PaletteIcon from '@lucide/svelte/icons/palette';
  import UserRoundIcon from '@lucide/svelte/icons/user-round';

  const groups = $derived([
    {
      label: 'settings.sidebar.personal',
      items: [
        { key: 'settings.tabs.profile_tab', path: '/settings', icon: UserRoundIcon },
        { key: 'settings.tabs.notifications_tab', path: '/settings/notifications', icon: BellIcon }
      ]
    },
    {
      label: 'mp_learning.settings.system',
      items: [
        { key: 'mp_learning.settings.preferences', path: '/settings/customize-lms', icon: PaletteIcon },
        { key: 'settings.tabs.emails_tab', path: '/settings/emails', icon: MailIcon }
      ]
    },
    {
      label: 'settings.sidebar.extensions',
      items: [
        ...($aiConfigured ? [{ key: 'settings.tabs.ai_tab', path: '/settings/ai', icon: SparklesIcon }] : []),
        ...($aiEnabled ? [{ key: 'settings.tabs.ai_tutor_tab', path: '/settings/ai-tutor', icon: BotIcon }] : [])
      ]
    }
  ]);

  const currentPath = $derived($currentOrgPath);
</script>

<Sidebar.Root collapsible="offcanvas" data-tone="ink">
  <Sidebar.Header class="gap-3 px-3! pt-4!">
    <div class="flex items-center justify-between gap-1">
      <a
        href={`${currentPath}/dash`}
        class="ui:text-sidebar-muted ui:hover:text-sidebar-accent-foreground ui:hover:bg-sidebar-accent flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors"
      >
        <ArrowLeftIcon size={16} class="custom shrink-0" />
        <span class="truncate">{$t('org_navigation.back_to_app')}</span>
      </a>
      <Sidebar.Trigger testId="settings-sidebar-trigger" class="ui:text-sidebar-muted" />
    </div>
    <p class="ui:text-sidebar-accent-foreground px-2 text-lg font-semibold tracking-tight">
      {$t('org_navigation.settings')}
    </p>
    <Search compact placeholder={$t('settings.sidebar.search')} />
  </Sidebar.Header>
  <Sidebar.Content>
    {#each groups.filter((group) => group.items.length > 0 && (group.label === 'settings.sidebar.personal' || $isOrgAdmin)) as group (group.label)}
      <Sidebar.Group class="py-1!">
        <Sidebar.GroupLabel>{$t(group.label)}</Sidebar.GroupLabel>
        <Sidebar.Menu class="gap-0.5">
          {#each group.items as item (item.path)}
            {@const href = `${currentPath}${item.path}`}
            {@const Icon = item.icon}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={isActive(page.url.pathname, href, undefined, true)}>
                {#snippet child({ props })}
                  <a {href} {...props}>
                    <Icon size={17} strokeWidth={1.75} class="custom" />
                    <span>{$t(item.key)}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.Group>
    {/each}
  </Sidebar.Content>
  <Sidebar.Rail />
</Sidebar.Root>
