<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { currentOrg } from '$lib/utils/store/org';
  import * as Page from '@cio/ui/base/page';
  import * as Table from '@cio/ui/base/table';
  import * as Select from '@cio/ui/base/select';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Field from '@cio/ui/base/field';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Textarea } from '@cio/ui/base/textarea';
  import { Search } from '@cio/ui/custom/search';
  import { Empty } from '@cio/ui/custom/empty';
  import AwardIcon from '@lucide/svelte/icons/award';
  import BadgeCheckIcon from '@lucide/svelte/icons/badge-check';
  import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
  import CalendarXIcon from '@lucide/svelte/icons/calendar-x';
  import BanIcon from '@lucide/svelte/icons/ban';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import ExportMenu from '$features/ui/export/export-menu.svelte';
  import { CertificateRegisterApi, type RegisterFilters } from '../api/certificate-register.svelte';
  import { buildCertificateRegisterExport, daysUntil, STATE_BADGE } from '../utils/certificate-register-utils';
  import type { CertificateRegisterRow, CertificateRegisterState, ExpiryWindow } from '../utils/types';

  interface Props {
    employeesPath: string;
  }

  let { employeesPath }: Props = $props();

  const api = new CertificateRegisterApi();
  const EXPIRY_WINDOWS: ExpiryWindow[] = [30, 60, 90];
  const STATES: CertificateRegisterState[] = ['valid', 'expiring', 'expired', 'revoked'];
  const STATE_ICONS = { valid: BadgeCheckIcon, expiring: CalendarClockIcon, expired: CalendarXIcon, revoked: BanIcon };

  let search = $state('');
  let courseId = $state('');
  let departmentId = $state('');
  let stateFilter = $state<CertificateRegisterState | ''>('');
  let expiringWithinDays = $state<ExpiryWindow>(30);
  let revoking = $state<CertificateRegisterRow | null>(null);
  let revokeReason = $state('');

  const filters = $derived<RegisterFilters>({
    search,
    courseId,
    departmentId,
    state: stateFilter,
    expiringWithinDays
  });
  const register = $derived(api.register);
  const pages = $derived(Math.max(1, Math.ceil((register?.total ?? 0) / api.limit)));
  const hasFilters = $derived(Boolean(search.trim() || courseId || departmentId || stateFilter));
  const courseLabel = $derived(
    register?.facets.courses.find((course) => course.id === courseId)?.title ??
      $t('certificate_register.filters.all_courses')
  );
  const departmentLabel = $derived.by(() => {
    if (!departmentId) return $t('learning_analytics.departments.all');
    if (departmentId === 'none') return $t('learning_analytics.departments.none');
    return (
      register?.facets.departments.find((department) => department.id === departmentId)?.name ??
      $t('learning_analytics.departments.all')
    );
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const current = filters;
    if (!$currentOrg.id) return;

    clearTimeout(timer);
    timer = setTimeout(() => untrack(() => api.load(current)), current.search ? 300 : 0);
  });

  onDestroy(() => {
    api.cancel();
    clearTimeout(timer);
  });

  function formatDay(value: string | null) {
    return value ? new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'medium' }).format(new Date(value)) : '';
  }

  function expiryNote(row: CertificateRegisterRow) {
    const days = daysUntil(row.expiresAt);
    if (days === null) return $t('certificate_register.no_expiry');
    if (days < 0) return $t('certificate_register.expired_ago', { count: -days });
    return $t('certificate_register.days_left', { count: days });
  }

  function toggleState(state: CertificateRegisterState) {
    stateFilter = stateFilter === state ? '' : state;
  }

  function clearFilters() {
    search = '';
    courseId = '';
    departmentId = '';
    stateFilter = '';
  }

  function openRevoke(row: CertificateRegisterRow) {
    revoking = row;
    revokeReason = '';
  }

  async function confirmRevoke() {
    if (!revoking || revokeReason.trim().length < 3) return;
    if (await api.revoke(revoking.id, revokeReason.trim())) {
      revoking = null;
      await api.load(filters, register?.page ?? 1);
    }
  }

  async function restore(row: CertificateRegisterRow) {
    if (await api.restore(row.id)) await api.load(filters, register?.page ?? 1);
  }

  async function loadExport() {
    const rows = await api.loadAll(filters);
    return buildCertificateRegisterExport(
      rows,
      $t('certificate_register.title'),
      {
        employee: $t('employees.name'),
        code: $t('employees.code'),
        department: $t('employees.department'),
        course: $t('learning_analytics.course'),
        certificate: $t('certificate_register.columns.code'),
        issued: $t('certificate_register.columns.issued'),
        expires: $t('certificate_register.columns.expires'),
        state: $t('certificate_register.columns.state'),
        reason: $t('certificate_register.revoke_reason')
      },
      (state) => $t(`certificate_register.state.${state}`)
    );
  }
</script>

<svelte:head><title>{$t('certificate_register.title')} · MP Learning</title></svelte:head>

<Page.Root class="w-full pb-8">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('learning_analytics.eyebrow')}</Page.Eyebrow>
      <Page.Title>{$t('certificate_register.title')}</Page.Title>
      <Page.Subtitle>{$t('certificate_register.subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
    <Page.Action>
      <ExportMenu
        document={loadExport}
        estimatedRowCount={register?.total ?? 0}
        disabled={!register?.total}
        testId="certificate-register-export"
      />
    </Page.Action>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      {#if api.failed}
        <div
          role="alert"
          class="ui:bg-danger-soft ui:text-danger-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
        >
          <p>{$t('certificate_register.load_error')}</p>
          <Button variant="outline" size="sm" onclick={() => api.load(filters)}>{$t('mp_workspace.retry')}</Button>
        </div>
      {/if}

      <section class="space-y-3" aria-label={$t('certificate_register.summary')}>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {#each STATES as state (state)}
            {@const Icon = STATE_ICONS[state]}
            <button
              type="button"
              class="state-tile ui:bg-card ui:shadow-card flex flex-col gap-3 rounded-xl border p-4 text-left transition md:p-5"
              class:state-tile-active={stateFilter === state}
              data-tone={state}
              aria-pressed={stateFilter === state}
              aria-label={`${$t(`certificate_register.state.${state}`)}: ${register?.summary[state] ?? '—'}`}
              data-testid={`certificate-register-state-${state}`}
              onclick={() => toggleState(state)}
            >
              <span class="flex items-start justify-between gap-2">
                <span class="ui:text-muted-foreground text-xs leading-relaxed font-medium"
                  >{$t(`certificate_register.state.${state}`)}</span
                >
                <span class="state-icon"><Icon class="custom size-4" /></span>
              </span>
              {#if !register}<Skeleton class="h-8 w-14" />{:else}<span
                  class="text-[28px] leading-none font-semibold tracking-tight tabular-nums"
                  >{register.summary[state]}</span
                >{/if}
              <span class="ui:text-muted-foreground hidden text-[11px] leading-relaxed sm:block"
                >{state === 'expiring'
                  ? $t('certificate_register.state_note.expiring', { days: expiringWithinDays })
                  : $t(`certificate_register.state_note.${state}`)}</span
              >
            </button>
          {/each}
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <span class="ui:text-muted-foreground">{$t('certificate_register.expiry_window')}</span>
          <div class="ui:bg-muted inline-flex rounded-lg p-0.5" role="group">
            {#each EXPIRY_WINDOWS as days (days)}
              <button
                type="button"
                class="rounded-md px-3 py-1.5 font-medium transition {expiringWithinDays === days
                  ? 'ui:bg-background ui:shadow-sm'
                  : 'ui:text-muted-foreground'}"
                aria-pressed={expiringWithinDays === days}
                onclick={() => (expiringWithinDays = days)}>{$t('certificate_register.days', { count: days })}</button
              >
            {/each}
          </div>
        </div>
      </section>

      <section class="ui:bg-card ui:shadow-card overflow-hidden rounded-xl border">
        <div class="flex flex-wrap items-center gap-2 p-4 md:p-5">
          <Search
            class="w-full! max-w-none! sm:w-80!"
            placeholder={$t('certificate_register.search')}
            bind:value={search}
          />
          <Select.Root type="single" value={courseId} onValueChange={(value) => (courseId = value ?? '')}>
            <Select.Trigger class="w-full sm:w-56" aria-label={$t('learning_analytics.course')}
              ><span class="truncate">{courseLabel}</span></Select.Trigger
            >
            <Select.Content>
              <Select.Item value="">{$t('certificate_register.filters.all_courses')}</Select.Item>
              {#each register?.facets.courses ?? [] as course (course.id)}
                <Select.Item value={course.id}>{course.title}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          {#if (register?.facets.departments.length ?? 0) > 1}
            <Select.Root type="single" value={departmentId} onValueChange={(value) => (departmentId = value ?? '')}>
              <Select.Trigger class="w-full sm:w-52" aria-label={$t('employees.department')}
                ><span class="truncate">{departmentLabel}</span></Select.Trigger
              >
              <Select.Content>
                <Select.Item value="">{$t('learning_analytics.departments.all')}</Select.Item>
                {#each register?.facets.departments ?? [] as department (department.id ?? 'none')}
                  <Select.Item value={department.id ?? 'none'}
                    >{department.name || $t('learning_analytics.departments.none')}</Select.Item
                  >
                {/each}
              </Select.Content>
            </Select.Root>
          {/if}
          {#if hasFilters}<Button variant="ghost" size="sm" onclick={clearFilters}
              >{$t('employees.clear_filters')}</Button
            >{/if}
        </div>

        {#if !register}
          <div class="space-y-2 px-5 pb-5">
            {#each [0, 1, 2, 3] as index (index)}<Skeleton class="h-12 w-full" />{/each}
          </div>
        {:else if !register.rows.length}
          <Empty
            icon={AwardIcon}
            title={hasFilters ? $t('certificate_register.no_results') : $t('certificate_register.empty_title')}
            description={hasFilters ? $t('mp_workspace.adjust_search') : $t('certificate_register.empty_description')}
            class="md:p-8!"
          />
        {:else}
          <Table.Root class={api.loading ? 'opacity-60 transition-opacity' : ''}>
            <Table.Header
              ><Table.Row
                ><Table.Head>{$t('employees.name')}</Table.Head><Table.Head class="hidden lg:table-cell"
                  >{$t('learning_analytics.course')}</Table.Head
                ><Table.Head class="hidden md:table-cell">{$t('certificate_register.columns.issued')}</Table.Head
                ><Table.Head>{$t('certificate_register.columns.expires')}</Table.Head><Table.Head
                  class="hidden sm:table-cell">{$t('certificate_register.columns.state')}</Table.Head
                ><Table.Head class="w-10"><span class="sr-only">{$t('certificate_register.actions')}</span></Table.Head
                ></Table.Row
              ></Table.Header
            >
            <Table.Body>
              {#each register.rows as row (row.id)}
                <Table.Row data-testid="certificate-register-row"
                  ><Table.Cell class="ui:whitespace-normal min-w-0"
                    ><a
                      href={`${employeesPath}?search=${encodeURIComponent(row.employeeCode ?? row.fullname)}`}
                      class="ui:hover:text-primary font-medium">{row.fullname}</a
                    >
                    <p class="ui:text-muted-foreground text-xs">
                      {[row.employeeCode, row.department].filter(Boolean).join(' · ')}
                    </p>
                    <p class="ui:text-muted-foreground mt-1 text-xs lg:hidden">{row.courseTitle}</p>
                    <span class="mt-1 inline-flex sm:hidden"
                      ><Badge variant={STATE_BADGE[row.state]}>{$t(`certificate_register.state.${row.state}`)}</Badge
                      ></span
                    ></Table.Cell
                  ><Table.Cell class="ui:whitespace-normal hidden max-w-64 lg:table-cell"
                    >{row.courseTitle}
                    <p class="ui:text-muted-foreground font-mono text-[11px] tracking-wide">{row.code}</p></Table.Cell
                  ><Table.Cell class="hidden md:table-cell">{formatDay(row.issuedAt)}</Table.Cell><Table.Cell
                    ><span class="block">{row.expiresAt ? formatDay(row.expiresAt) : '—'}</span><span
                      class="text-[11px] {row.state === 'expiring'
                        ? 'ui:text-warning-foreground font-medium'
                        : row.state === 'expired'
                          ? 'ui:text-danger-foreground'
                          : 'ui:text-muted-foreground'}">{row.state === 'revoked' ? '' : expiryNote(row)}</span
                    ></Table.Cell
                  ><Table.Cell class="hidden sm:table-cell"
                    ><Badge variant={STATE_BADGE[row.state]}>{$t(`certificate_register.state.${row.state}`)}</Badge
                    >{#if row.state === 'revoked' && row.revokedReason}<p
                        class="ui:text-muted-foreground mt-1 max-w-48 truncate text-[11px]"
                        title={row.revokedReason}
                      >
                        {row.revokedReason}
                      </p>{/if}</Table.Cell
                  ><Table.Cell class="text-right"
                    ><DropdownMenu.Root
                      ><DropdownMenu.Trigger
                        >{#snippet child({ props })}<Button
                            {...props}
                            variant="ghost"
                            size="icon"
                            aria-label={$t('certificate_register.actions')}
                            disabled={api.savingId === row.id}><EllipsisIcon size={16} /></Button
                          >{/snippet}</DropdownMenu.Trigger
                      ><DropdownMenu.Content align="end" class="w-56">
                        <DropdownMenu.Item
                          ><a
                            href={`/verify/${row.code}`}
                            target="_blank"
                            rel="noopener"
                            class="flex w-full items-center gap-2"
                            ><ExternalLinkIcon size={14} />{$t('certificate_register.open_verify')}</a
                          ></DropdownMenu.Item
                        >
                        {#if register.canRevoke}
                          <DropdownMenu.Separator />
                          {#if row.state === 'revoked'}<DropdownMenu.Item onclick={() => restore(row)}
                              >{$t('certificate_register.restore')}</DropdownMenu.Item
                            >{:else}<DropdownMenu.Item class="ui:text-danger-foreground" onclick={() => openRevoke(row)}
                              >{$t('certificate_register.revoke')}</DropdownMenu.Item
                            >{/if}
                        {/if}
                      </DropdownMenu.Content></DropdownMenu.Root
                    ></Table.Cell
                  ></Table.Row
                >
              {/each}
            </Table.Body>
          </Table.Root>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs">
            <p class="ui:text-muted-foreground">{$t('certificate_register.total', { count: register.total })}</p>
            <div class="flex items-center gap-3">
              <span>{$t('employees.page_label', { page: register.page, pages })}</span><Button
                size="icon"
                variant="secondary"
                aria-label={$t('employees.previous')}
                disabled={register.page <= 1 || api.loading}
                onclick={() => api.load(filters, register.page - 1)}><ChevronLeftIcon size={16} /></Button
              ><Button
                size="icon"
                variant="secondary"
                aria-label={$t('employees.next')}
                disabled={register.page >= pages || api.loading}
                onclick={() => api.load(filters, register.page + 1)}><ChevronRightIcon size={16} /></Button
              >
            </div>
          </div>
        {/if}
      </section>
    {/snippet}
  </Page.Body>
</Page.Root>

<Dialog.Root open={revoking !== null} onOpenChange={(open) => !open && (revoking = null)}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header
      ><Dialog.Title>{$t('certificate_register.revoke_title')}</Dialog.Title><Dialog.Description
        >{$t('certificate_register.revoke_description', {
          name: revoking?.fullname ?? '',
          course: revoking?.courseTitle ?? ''
        })}</Dialog.Description
      ></Dialog.Header
    >
    <form
      class="space-y-4"
      onsubmit={(event) => {
        event.preventDefault();
        void confirmRevoke();
      }}
    >
      <Field.Field
        ><Field.Label for="certificate-revoke-reason">{$t('certificate_register.revoke_reason')}</Field.Label><Textarea
          id="certificate-revoke-reason"
          bind:value={revokeReason}
          maxlength={500}
          rows={3}
          required
          placeholder={$t('certificate_register.revoke_placeholder')}
        /><Field.Description>{$t('certificate_register.revoke_hint')}</Field.Description></Field.Field
      >
      <Dialog.Footer>
        <Button type="button" variant="outline" onclick={() => (revoking = null)}
          >{$t('certificate_register.cancel')}</Button
        >
        <Button
          type="submit"
          variant="destructive"
          loading={api.savingId === revoking?.id}
          disabled={revokeReason.trim().length < 3}>{$t('certificate_register.revoke')}</Button
        >
      </Dialog.Footer>
    </form>
  </Dialog.Content>
</Dialog.Root>

<style>
  .state-tile:hover {
    border-color: var(--border-strong, var(--border));
  }
  .state-tile-active {
    box-shadow: 0 0 0 2px var(--primary);
  }
  .state-icon {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: 0.6rem;
    background: var(--success-soft);
    color: var(--success-foreground);
  }
  [data-tone='expiring'] .state-icon {
    background: var(--warning-soft);
    color: var(--warning-foreground);
  }
  [data-tone='expired'] .state-icon {
    background: var(--danger-soft);
    color: var(--danger-foreground);
  }
  [data-tone='revoked'] .state-icon {
    background: var(--muted);
    color: var(--muted-foreground);
  }
</style>
