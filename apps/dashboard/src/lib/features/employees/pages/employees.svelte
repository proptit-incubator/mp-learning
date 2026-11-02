<script lang="ts">
  import { page } from '$app/state';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import * as Sheet from '@cio/ui/base/sheet';
  import SearchIcon from '@lucide/svelte/icons/search';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import DownloadIcon from '@lucide/svelte/icons/download';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import MoreHorizontalIcon from '@lucide/svelte/icons/ellipsis';
  import UsersIcon from '@lucide/svelte/icons/users-round';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { onDestroy, untrack } from 'svelte';
  import { EmployeesApi } from '../api/employees.svelte';
  import { currentOrg } from '$lib/utils/store/org';
  import { t, locale } from '$lib/utils/functions/translations';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import {
    EMPLOYEE_ROLES,
    EMPLOYEE_STATUSES,
    ZEmployeeList,
    type EmployeeStatus
  } from '@cio/utils/validation/organization';
  import * as Page from '@cio/ui/base/page';
  import * as Field from '@cio/ui/base/field';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Select from '@cio/ui/base/select';
  import * as Table from '@cio/ui/base/table';
  import { Input } from '@cio/ui/base/input';
  import { Textarea } from '@cio/ui/base/textarea';
  import { Checkbox } from '@cio/ui/base/checkbox';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import BookPlusIcon from '@lucide/svelte/icons/book-plus';
  import { SvelteSet } from 'svelte/reactivity';
  import { AssignCoursesModal, EnrollmentStateBadge } from '$features/enrollment';

  const api = new EmployeesApi();
  const selectedIds = new SvelteSet<string>();
  let assignOpen = $state(false);
  let assignEmployeeIds = $state<string[]>([]);
  let assignLabel = $state<string | undefined>(undefined);
  const visibleIds = $derived(api.roster?.rows.map((row) => row.id) ?? []);
  const allVisibleSelected = $derived(visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id)));

  function openAssign(employeeIds: string[], label?: string) {
    assignEmployeeIds = employeeIds;
    assignLabel = label;
    assignOpen = true;
  }

  function toggleAllVisible(checked: boolean) {
    for (const id of visibleIds) {
      if (checked) selectedIds.add(id);
      else selectedIds.delete(id);
    }
  }

  function afterAssign() {
    selectedIds.clear();
    if (api.detailOpen && api.details) void api.view(api.details.employee);
  }
  let loadedLocation = '';
  const search = new DebouncedSearch({
    onApply: (value) => {
      api.search = value;
      api.page = 1;
      void api.load();
    }
  });
  const department = new DebouncedSearch({
    onApply: (value) => {
      api.department = value;
      api.page = 1;
      void api.load();
    }
  });
  const jobTitle = new DebouncedSearch({
    onApply: (value) => {
      api.jobTitle = value;
      api.page = 1;
      void api.load();
    }
  });
  const roles = $derived(
    api.roster?.access.role === 'ADMIN'
      ? EMPLOYEE_ROLES
      : EMPLOYEE_ROLES.filter((role) => role === 'EMPLOYEE' || role === 'MANAGER')
  );
  const canManage = $derived(api.roster?.access.canManage ?? false);

  $effect(() => {
    const orgId = $currentOrg.id;
    const location = `${orgId}:${page.url.search}`;
    if (!orgId || loadedLocation === location) return;

    loadedLocation = location;
    const parameters = new URLSearchParams(page.url.search);
    untrack(() => {
      api.roster = null;
      api.options = null;
      api.details = null;
      api.editorOpen = false;
      api.detailOpen = false;
      api.importOpen = false;
      api.message = '';
      void initialize(parameters, location);
    });
  });
  onDestroy(() => {
    search.destroy();
    department.destroy();
    jobTitle.destroy();
  });

  async function initialize(parameters: URLSearchParams, location: string) {
    const parsed = ZEmployeeList.safeParse(Object.fromEntries(parameters));
    const query = parsed.success ? parsed.data : ZEmployeeList.parse({});
    api.profileId = query.profileId;
    api.learningFilters = {
      enrollment: query.enrollment,
      completion: query.completion,
      certificate: query.certificate
    };
    api.search = query.search;
    api.department = query.department;
    api.jobTitle = query.jobTitle ?? '';
    api.status = query.status ?? '';
    api.page = query.page;
    search.sync(api.search);
    department.sync(api.department);
    jobTitle.sync(api.jobTitle);
    await api.load();
    if (loadedLocation !== location) return;

    if (api.profileId && api.roster?.rows[0]) await api.view(api.roster.rows[0]);
    if (parameters.get('action') === 'import' && api.roster?.access.canManage) await openImport();
    if (parameters.get('action') === 'create' && api.roster?.access.canManage) await api.openCreate();
  }

  function filterStatus(value: string) {
    api.status = value === 'ALL' ? '' : (value as EmployeeStatus);
    api.page = 1;
    void api.load();
  }

  async function openImport() {
    await api.loadOptions();
    api.importRows = [];
    api.importResult = null;
    api.importSend = true;
    api.message = '';
    api.importOpen = true;
  }
</script>

<svelte:head><title>{$t('employees.title')} · MP Learning</title></svelte:head>

<Page.Root class="employee-workspace mx-auto w-full max-w-[1600px] py-6 lg:py-9">
  <Page.Header class="gap-4">
    <Page.HeaderContent>
      <p class="employee-eyebrow">{$t('employees.workspace_label')}</p>
      <Page.Title class="text-3xl font-semibold tracking-tight">{$t('employees.title')}</Page.Title>
      <Page.Subtitle>{$t('employees.subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
    {#if api.roster}
      <Page.Action class="flex-wrap">
        <Button variant="outline" disabled={api.exporting || api.isLoading} onclick={() => api.exportEmployees()}
          ><DownloadIcon size={16} />{$t('employees.export')}</Button
        >
        {#if canManage}
          <Button variant="outline" onclick={openImport} disabled={api.isLoading}
            ><UploadIcon size={16} />{$t('employees.import')}</Button
          >
          <Button variant="outline" onclick={() => openAssign([...selectedIds])} disabled={!selectedIds.size}
            ><BookPlusIcon size={16} />{$t('enrollment.assign_button')}{selectedIds.size
              ? ` (${selectedIds.size})`
              : ''}</Button
          >
          <Button onclick={() => api.openCreate()} disabled={api.isLoading} testId="employee-create"
            ><PlusIcon size={17} />{$t('employees.add')}</Button
          >
        {/if}
      </Page.Action>
    {/if}
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <section class="employee-directory">
        <div class="directory-heading">
          <div>
            <h2>{$t('employees.directory')}</h2>
            <p>{$t('employees.directory_hint')}</p>
          </div>
          {#if api.roster}<span class="directory-count">{$t('employees.total', { count: api.roster.total })}</span>{/if}
        </div>
        <div class="directory-tabs" role="group" aria-label={$t('employees.status_label')}>
          {#each ['ALL', ...EMPLOYEE_STATUSES] as status (status)}<button
              type="button"
              class:tab-active={(api.status || 'ALL') === status}
              aria-pressed={(api.status || 'ALL') === status}
              onclick={() => filterStatus(status)}
              >{$t(status === 'ALL' ? 'employees.all' : `employees.status.${status}`)}</button
            >{/each}
        </div>
        <div class="directory-toolbar">
          <div class="directory-search">
            <SearchIcon size={17} class="search-symbol" /><Input
              id="employee-search"
              class="pl-10"
              aria-label={$t('employees.search')}
              placeholder={$t('employees.search')}
              value={search.draft}
              oninput={(event) => search.input(event.currentTarget.value)}
            />
          </div>
          <Input
            id="employee-department-filter"
            class="department-filter"
            aria-label={$t('employees.department')}
            placeholder={$t('employees.department')}
            value={department.draft}
            oninput={(event) => department.input(event.currentTarget.value)}
          />
          <Input
            id="employee-job-title-filter"
            class="department-filter"
            aria-label={$t('employees.job_title')}
            placeholder={$t('employees.job_title')}
            value={jobTitle.draft}
            oninput={(event) => jobTitle.input(event.currentTarget.value)}
          />
          {#if api.profileId || api.search || api.department || api.jobTitle || api.status || Object.values(api.learningFilters).some(Boolean)}<Button
              size="sm"
              variant="secondary"
              onclick={() => {
                api.profileId = undefined;
                api.learningFilters = {};
                api.search = '';
                api.department = '';
                api.jobTitle = '';
                api.status = '';
                api.page = 1;
                search.reset();
                department.reset();
                jobTitle.reset();
                void api.load();
              }}>{$t('employees.clear_filters')}</Button
            >{/if}
        </div>
        {#if api.learningFilters.enrollment || api.learningFilters.completion || api.learningFilters.certificate}
          <div class="flex flex-wrap gap-2 px-6 pb-4" aria-live="polite">
            {#if api.learningFilters.enrollment}<span class="directory-count"
                >{$t(`audience.filter.${api.learningFilters.enrollment}`)}</span
              >{/if}
            {#if api.learningFilters.completion}<span class="directory-count"
                >{$t(`audience.filter.${api.learningFilters.completion}`)}</span
              >{/if}
            {#if api.learningFilters.certificate}<span class="directory-count"
                >{$t(`audience.filter.certificate_${api.learningFilters.certificate}`)}</span
              >{/if}
          </div>
        {/if}
        {#if api.message}<p role="alert" class="ui:text-destructive px-6 py-4 text-sm">{$t(api.message)}</p>{/if}
        {#if !api.roster && !api.message}
          <div class="space-y-4 p-6">
            {#each [0, 1, 2, 3] as index (index)}<Skeleton class="h-16 w-full rounded-lg" />{/each}
          </div>
        {:else if api.roster}
          <Table.Root class="employee-table">
            <Table.Header
              ><Table.Row
                >{#if canManage}<Table.Head class="w-10"
                    ><Checkbox
                      aria-label={$t('enrollment.select_all')}
                      checked={allVisibleSelected}
                      onCheckedChange={(checked) => toggleAllVisible(!!checked)}
                    /></Table.Head
                  >{/if}<Table.Head>{$t('employees.name')}</Table.Head><Table.Head>{$t('employees.code')}</Table.Head
                ><Table.Head>{$t('employees.department')}</Table.Head><Table.Head
                  >{$t('employees.role_label')}</Table.Head
                ><Table.Head>{$t('employees.status_label')}</Table.Head><Table.Head>{$t('employees.start')}</Table.Head
                ><Table.Head class="w-16"><span class="sr-only">{$t('employees.actions')}</span></Table.Head></Table.Row
              ></Table.Header
            >
            <Table.Body>
              {#each api.roster.rows as staff (staff.id)}
                <Table.Row class="employee-row">
                  {#if canManage}<Table.Cell
                      ><Checkbox
                        aria-label={staff.fullname}
                        checked={selectedIds.has(staff.id)}
                        onCheckedChange={(checked) => {
                          if (checked) selectedIds.add(staff.id);
                          else selectedIds.delete(staff.id);
                        }}
                      /></Table.Cell
                    >{/if}
                  <Table.Cell
                    ><div class="employee-identity">
                      <UserAvatar src={staff.avatarUrl} alt={staff.fullname} class="size-10 shrink-0" />
                      <div class="min-w-0">
                        <button type="button" class="employee-name" onclick={() => api.view(staff)}
                          >{staff.fullname}</button
                        >
                        <p class="employee-email">{staff.email}</p>
                        <div class="employee-mobile-meta">
                          <span class="employee-code">{staff.employeeCode}</span>
                          <span class="employee-status" data-status={staff.status}
                            ><span aria-hidden="true"></span>{$t(`employees.status.${staff.status}`)}</span
                          >
                        </div>
                      </div>
                    </div></Table.Cell
                  >
                  <Table.Cell><span class="employee-code">{staff.employeeCode}</span></Table.Cell>
                  <Table.Cell
                    ><div class="employee-department">{staff.department || $t('employees.unassigned')}</div>
                    <p class="employee-email">{staff.jobTitle}</p></Table.Cell
                  >
                  <Table.Cell><span class="employee-role">{$t(`employees.role.${staff.role}`)}</span></Table.Cell>
                  <Table.Cell
                    ><span class="employee-status" data-status={staff.status}
                      ><span aria-hidden="true"></span>{$t(`employees.status.${staff.status}`)}</span
                    ></Table.Cell
                  >
                  <Table.Cell class="ui:text-muted-foreground text-sm whitespace-nowrap"
                    >{staff.startDate
                      ? new Intl.DateTimeFormat($locale, { dateStyle: 'medium' }).format(
                          new Date(`${staff.startDate}T00:00:00`)
                        )
                      : '—'}</Table.Cell
                  >
                  <Table.Cell>
                    <DropdownMenu.Root
                      ><DropdownMenu.Trigger
                        >{#snippet child({ props })}<Button
                            {...props}
                            variant="secondary"
                            size="icon"
                            aria-label={`${$t('employees.actions')} · ${staff.fullname}`}
                            ><MoreHorizontalIcon size={18} /></Button
                          >{/snippet}</DropdownMenu.Trigger
                      ><DropdownMenu.Content align="end" class="w-56">
                        <DropdownMenu.Item onclick={() => api.view(staff)}>{$t('employees.details')}</DropdownMenu.Item>
                        {#if canManage}<DropdownMenu.Item onclick={() => openAssign([staff.id], staff.fullname)}
                            >{$t('enrollment.assign_button')}</DropdownMenu.Item
                          ><DropdownMenu.Item onclick={() => api.openEdit(staff)}
                            >{$t('employees.edit')}</DropdownMenu.Item
                          >
                          {#if staff.status === 'DRAFT' || staff.status === 'INVITED'}<DropdownMenu.Item
                              disabled={api.isLoading}
                              onclick={() => api.resend(staff)}>{$t('employees.send')}</DropdownMenu.Item
                            >{/if}
                          {#if staff.memberId !== $currentOrg.memberId}<DropdownMenu.Separator />
                            {#if staff.status === 'ACTIVE'}<DropdownMenu.Item
                                onclick={() => api.openStatus(staff, 'SUSPENDED')}
                                >{$t('employees.suspend')}</DropdownMenu.Item
                              >{/if}
                            {#if staff.status === 'SUSPENDED' || staff.status === 'LEFT'}<DropdownMenu.Item
                                onclick={() => api.openStatus(staff, 'ACTIVE')}
                                >{$t('employees.restore')}</DropdownMenu.Item
                              >{/if}
                            {#if staff.status !== 'LEFT'}<DropdownMenu.Item
                                variant="destructive"
                                onclick={() => api.openStatus(staff, 'LEFT')}>{$t('employees.leave')}</DropdownMenu.Item
                              >{/if}
                          {/if}
                        {/if}
                      </DropdownMenu.Content></DropdownMenu.Root
                    >
                  </Table.Cell>
                </Table.Row>
              {:else}<Table.Row
                  ><Table.Cell colspan={canManage ? 8 : 7}
                    ><div class="directory-empty">
                      <span class="empty-icon"><UsersIcon size={28} /></span>
                      <h3>{$t('employees.empty')}</h3>
                      <p>{$t('employees.empty_hint')}</p>
                      {#if canManage}<Button variant="outline" onclick={() => api.openCreate()}
                          ><PlusIcon size={16} />{$t('employees.add')}</Button
                        >{/if}
                    </div></Table.Cell
                  ></Table.Row
                >{/each}
            </Table.Body>
          </Table.Root>
          <div class="directory-footer">
            <p>{$t('employees.total', { count: api.roster.total })}</p>
            <div class="flex items-center gap-3">
              <span
                >{$t('employees.page_label', {
                  page: api.page,
                  pages: Math.max(1, Math.ceil(api.roster.total / 25))
                })}</span
              ><Button
                size="icon"
                variant="secondary"
                aria-label={$t('employees.previous')}
                disabled={api.page <= 1 || api.isLoading}
                onclick={() => {
                  api.page--;
                  void api.load();
                }}><ChevronLeftIcon size={16} /></Button
              ><Button
                size="icon"
                variant="secondary"
                aria-label={$t('employees.next')}
                disabled={api.page * 25 >= api.roster.total || api.isLoading}
                onclick={() => {
                  api.page++;
                  void api.load();
                }}><ChevronRightIcon size={16} /></Button
              >
            </div>
          </div>
        {/if}
      </section>
    {/snippet}
  </Page.Body>
</Page.Root>

<Dialog.Root bind:open={api.editorOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
    <Dialog.Header
      ><Dialog.Title>{$t(api.editingId ? 'employees.edit' : 'employees.add')}</Dialog.Title><Dialog.Description
        >{$t('employees.form_hint')}</Dialog.Description
      ></Dialog.Header
    >
    <Field.Group>
      <Field.Set>
        <Field.Legend>{$t('employees.identity')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <Field.Field
            ><Field.Label for="employee-code">{$t('employees.code')}</Field.Label><Input
              id="employee-code"
              bind:value={api.fields.employeeCode}
              disabled={!!api.editingId}
              maxlength={50}
              required
              data-testid="employee-code"
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-fullname">{$t('employees.name')}</Field.Label><Input
              id="employee-fullname"
              bind:value={api.fields.fullname}
              required
              maxlength={200}
            /></Field.Field
          >
          <Field.Field class="sm:col-span-2"
            ><Field.Label for="employee-email">{$t('employees.email')}</Field.Label><Input
              id="employee-email"
              type="email"
              bind:value={api.fields.email}
              disabled={!!api.editingId}
              required
            /></Field.Field
          >
        </Field.Group>
      </Field.Set>
      <Field.Separator />
      <Field.Set>
        <Field.Legend>{$t('employees.organization')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <Field.Field
            ><Field.Label for="employee-department">{$t('employees.department')}</Field.Label><Input
              id="employee-department"
              bind:value={api.fields.department}
              maxlength={150}
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-job">{$t('employees.job')}</Field.Label><Input
              id="employee-job"
              bind:value={api.fields.jobTitle}
              maxlength={150}
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-start">{$t('employees.start')}</Field.Label><Input
              id="employee-start"
              type="date"
              bind:value={api.fields.startDate}
            /></Field.Field
          >
          <Field.Field>
            <Field.Label>{$t('employees.role_label')}</Field.Label>
            <Select.Root type="single" bind:value={api.fields.role}
              ><Select.Trigger class="w-full">{$t(`employees.role.${api.fields.role}`)}</Select.Trigger><Select.Content
                >{#each roles as role (role)}<Select.Item value={role}>{$t(`employees.role.${role}`)}</Select.Item
                  >{/each}</Select.Content
              ></Select.Root
            >
          </Field.Field>
          <Field.Field class="sm:col-span-2">
            <Field.Label>{$t('employees.manager')}</Field.Label>
            <Select.Root
              type="single"
              value={api.fields.managerId ?? 'none'}
              onValueChange={(value) => {
                api.fields.managerId = value === 'none' ? null : value;
              }}
            >
              <Select.Trigger class="w-full"
                >{api.options?.managers.find((manager) => manager.id === api.fields.managerId)?.fullname ??
                  $t('employees.none')}</Select.Trigger
              >
              <Select.Content
                ><Select.Item value="none">{$t('employees.none')}</Select.Item
                >{#each api.options?.managers.filter((manager) => manager.id !== api.editingId) ?? [] as manager (manager.id)}<Select.Item
                    value={manager.id}>{manager.employeeCode} · {manager.fullname}</Select.Item
                  >{/each}</Select.Content
              >
            </Select.Root>
          </Field.Field>
        </Field.Group>
      </Field.Set>
    </Field.Group>
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer>
      {#if !api.editingId}<Button size="sm" variant="secondary" disabled={api.isLoading} onclick={() => api.save(false)}
          >{$t('employees.draft')}</Button
        >{/if}
      <Button
        size="sm"
        variant="outline"
        disabled={api.isLoading}
        onclick={() => {
          api.editorOpen = false;
        }}>{$t('employees.cancel')}</Button
      >
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.save(!api.editingId)}
        testId="employee-save">{$t(api.editingId ? 'employees.save' : 'employees.create_send')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={api.importOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
    <Dialog.Header
      ><Dialog.Title>{$t('employees.import')}</Dialog.Title><Dialog.Description
        >{$t('employees.import_hint')}</Dialog.Description
      ></Dialog.Header
    >
    <Button size="sm" variant="secondary" onclick={() => api.downloadTemplate()}>{$t('employees.template')}</Button>
    <Field.Group>
      <Field.Field
        ><Field.Label for="employee-file">{$t('employees.file')}</Field.Label><Input
          id="employee-file"
          type="file"
          accept=".csv,.xlsx"
          disabled={api.isLoading}
          onchange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void api.readImport(file);
          }}
        /></Field.Field
      >
      <Field.Field orientation="horizontal"
        ><Checkbox
          id="employee-import-send"
          bind:checked={api.importSend}
          onCheckedChange={() => {
            api.importResult = null;
          }}
        /><Field.Label for="employee-import-send">{$t('employees.send_import')}</Field.Label></Field.Field
      >
    </Field.Group>
    {#if api.importResult}
      <p class="text-sm">
        {$t(
          api.importing
            ? 'employees.import_running'
            : api.importResult.preview
              ? 'employees.preview'
              : 'employees.import_done'
        )}
      </p>
      <div class="max-h-64 overflow-auto">
        <Table.Root
          ><Table.Header
            ><Table.Row
              ><Table.Head>{$t('employees.row')}</Table.Head><Table.Head>{$t('employees.code')}</Table.Head><Table.Head
                >{$t('employees.result')}</Table.Head
              ></Table.Row
            ></Table.Header
          ><Table.Body
            >{#each api.importResult.rows as row (row.row)}<Table.Row
                ><Table.Cell>{row.row}</Table.Cell><Table.Cell>{row.employeeCode}</Table.Cell><Table.Cell
                  >{row.success
                    ? $t(
                        row.emailSent === false
                          ? 'employees.errors.email'
                          : api.importResult.preview
                            ? 'employees.ready'
                            : 'employees.saved'
                      )
                    : $t(row.message)}</Table.Cell
                ></Table.Row
              >{/each}</Table.Body
          ></Table.Root
        >
      </div>
      {#if api.importResult.rows.some((row) => !row.success)}<Button
          size="sm"
          variant="secondary"
          onclick={() => api.downloadFailures()}>{$t('employees.download_errors')}</Button
        >{/if}
    {/if}
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer>
      <Button
        size="sm"
        variant="secondary"
        disabled={!api.importRows.length || api.importing}
        onclick={() => api.runImport(true)}>{$t('employees.review')}</Button
      >
      <Button
        size="sm"
        variant="outline"
        disabled={api.importing}
        onclick={() => {
          api.importOpen = false;
        }}>{$t('employees.cancel')}</Button
      >
      <Button
        size="sm"
        loading={api.importing}
        disabled={!api.importResult?.preview || !api.importResult.rows.some((row) => row.success) || api.importing}
        onclick={() => api.runImport(false)}>{$t('employees.confirm_import')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Sheet.Root bind:open={api.detailOpen}>
  <Sheet.Content side="right" class="employee-profile w-full overflow-y-auto p-6 sm:max-w-3xl sm:p-8">
    <Sheet.Header
      ><Sheet.Title>{api.details?.employee.fullname}</Sheet.Title><Sheet.Description
        >{api.details?.employee.employeeCode} · {api.details?.employee.department}</Sheet.Description
      ></Sheet.Header
    >
    {#if api.details}
      {@const staff = api.details.employee}
      <div class="employee-profile-summary">
        <UserAvatar src={staff.avatarUrl} alt={staff.fullname} class="size-10 shrink-0" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium break-all">{staff.email}</p>
          <p class="employee-email">{staff.jobTitle || $t('employees.unassigned')}</p>
        </div>
        <span class="employee-status" data-status={staff.status}
          ><span aria-hidden="true"></span>{$t(`employees.status.${staff.status}`)}</span
        >
      </div>
      <dl class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt class="ui:text-muted-foreground mb-1 text-xs">{$t('employees.department')}</dt>
          <dd>{staff.department || $t('employees.unassigned')}</dd>
        </div>
        <div>
          <dt class="ui:text-muted-foreground mb-1 text-xs">{$t('employees.role_label')}</dt>
          <dd>{$t(`employees.role.${staff.role}`)}</dd>
        </div>
      </dl>
    {/if}
    <div class="ui:border-border mt-6 flex items-center justify-between gap-3 border-b pb-3">
      <h3 class="text-base font-semibold">{$t('enrollment.employee_courses')}</h3>
      {#if canManage && api.details}<Button
          size="sm"
          variant="outline"
          onclick={() => openAssign([api.details!.employee.id], api.details!.employee.fullname)}
          ><BookPlusIcon size={15} />{$t('enrollment.assign_button')}</Button
        >{/if}
    </div>
    <Table.Root
      ><Table.Header
        ><Table.Row
          ><Table.Head>{$t('employees.course')}</Table.Head><Table.Head>{$t('enrollment.how_joined')}</Table.Head
          ><Table.Head>{$t('enrollment.state_label')}</Table.Head><Table.Head>{$t('enrollment.progress')}</Table.Head
          ><Table.Head>{$t('employees.due')}</Table.Head><Table.Head>{$t('employees.completed')}</Table.Head></Table.Row
        ></Table.Header
      ><Table.Body
        >{#each api.details?.enrollments ?? [] as enrollment (enrollment.id)}<Table.Row
            ><Table.Cell
              >{enrollment.courseTitle}{#if enrollment.batchLabel}<p class="ui:text-muted-foreground text-xs">
                  {enrollment.batchLabel}
                </p>{/if}</Table.Cell
            ><Table.Cell>{$t(`enrollment.kind.${enrollment.kind}`)}</Table.Cell><Table.Cell
              ><EnrollmentStateBadge state={enrollment.state} /></Table.Cell
            ><Table.Cell>{enrollment.progressPercent}%</Table.Cell><Table.Cell
              >{enrollment.dueDate ? new Date(enrollment.dueDate).toLocaleDateString($locale) : ''}</Table.Cell
            ><Table.Cell
              >{enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleDateString($locale) : ''}</Table.Cell
            ></Table.Row
          >{:else}<Table.Row><Table.Cell colspan={6}>{$t('employees.no_learning')}</Table.Cell></Table.Row
          >{/each}</Table.Body
      ></Table.Root
    >
    {#if canManage}<h3 class="ui:border-border mt-6 border-b pb-3 text-base font-semibold">
        {$t('employees.history')}
      </h3>
      <ul class="space-y-2 text-sm">
        {#each api.details?.audit ?? [] as event (event.id)}<li>
            <span class="ui:text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span> · {$t(
              `employees.audit.${event.action}`
            )} · {event.actorName ?? ''}{#if event.reason}
              · {event.reason}{/if}
          </li>{/each}
      </ul>{/if}
    <Sheet.Footer
      ><Button
        size="sm"
        variant="outline"
        onclick={() => {
          api.detailOpen = false;
        }}>{$t('employees.close')}</Button
      ></Sheet.Footer
    >
  </Sheet.Content>
</Sheet.Root>

<Dialog.Root
  open={!!api.statusTarget}
  onOpenChange={(open) => {
    if (!open) api.statusTarget = null;
  }}
>
  <Dialog.Content
    ><Dialog.Header
      ><Dialog.Title>{$t(`employees.status.${api.nextStatus}`)} · {api.statusTarget?.fullname}</Dialog.Title
      ><Dialog.Description>{$t('employees.status_hint')}</Dialog.Description></Dialog.Header
    >
    <Field.Field
      ><Field.Label for="employee-reason">{$t('employees.reason')}</Field.Label><Textarea
        id="employee-reason"
        bind:value={api.reason}
        maxlength={500}
        required
      /></Field.Field
    >
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer
      ><Button
        size="sm"
        variant="outline"
        onclick={() => {
          api.statusTarget = null;
        }}>{$t('employees.cancel')}</Button
      ><Button
        size="sm"
        disabled={!api.reason.trim() || api.isLoading}
        loading={api.isLoading}
        onclick={() => api.changeStatus()}>{$t('employees.confirm')}</Button
      ></Dialog.Footer
    >
  </Dialog.Content>
</Dialog.Root>

<AssignCoursesModal
  bind:open={assignOpen}
  employeeIds={assignEmployeeIds}
  employeeLabel={assignLabel}
  onAssigned={afterAssign}
/>

<style>
  :global(.employee-workspace) {
    --employee-accent: #175cd3;
  }
  :global(.employee-workspace [data-slot='page-header']) {
    padding-top: 0;
  }
  :global(.employee-profile[data-slot='sheet-content']) {
    width: min(100%, 768px);
    max-width: 768px;
  }
  .employee-eyebrow {
    color: var(--employee-accent);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .employee-directory {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 2px 5px rgb(15 23 42 / 3%);
    overflow: hidden;
  }
  .directory-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 24px 18px;
  }
  .directory-heading h2 {
    font-size: 17px;
    font-weight: 650;
    letter-spacing: -0.02em;
  }
  .directory-heading p {
    color: var(--muted-foreground);
    font-size: 13px;
    margin-top: 5px;
  }
  .directory-count {
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 5px 10px;
    font-size: 12px;
    white-space: nowrap;
    color: var(--muted-foreground);
  }
  .directory-tabs {
    display: flex;
    gap: 24px;
    padding: 0 24px;
    overflow-x: auto;
    border-bottom: 1px solid var(--border);
  }
  .directory-tabs button {
    white-space: nowrap;
    padding: 14px 0;
    color: var(--muted-foreground);
    font-size: 13px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
  }
  .directory-tabs button:hover {
    color: var(--foreground);
  }
  .directory-tabs button:focus-visible,
  .employee-name:focus-visible {
    outline: 2px solid var(--employee-accent);
    outline-offset: 4px;
    border-radius: 3px;
  }
  .directory-tabs .tab-active {
    color: var(--employee-accent);
    border-color: var(--employee-accent);
  }
  .directory-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 18px 24px;
  }
  .directory-search {
    flex: 1;
    position: relative;
    min-width: 220px;
    max-width: 460px;
  }
  .directory-search :global(.search-symbol) {
    position: absolute;
    z-index: 1;
    top: 10px;
    left: 12px;
    color: var(--muted-foreground);
    pointer-events: none;
  }
  .directory-search :global(input) {
    padding-left: 40px;
  }
  .directory-toolbar :global(.department-filter) {
    width: 210px;
  }
  .employee-directory :global(th) {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    height: 46px;
    background: var(--muted);
    padding-left: 20px;
    padding-right: 20px;
  }
  .employee-directory :global(td) {
    padding: 19px 20px;
    vertical-align: middle;
  }
  .employee-identity {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 240px;
  }
  .employee-mobile-meta {
    display: none;
  }
  .employee-profile-summary {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 18px 0;
    border-bottom: 1px solid var(--border);
  }
  .employee-name {
    color: var(--foreground);
    font-size: 14px;
    font-weight: 600;
    text-align: left;
  }
  .employee-name:hover {
    color: var(--employee-accent);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .employee-email {
    font-size: 12px;
    color: var(--muted-foreground);
    margin-top: 4px;
  }
  .employee-code {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: var(--muted-foreground);
  }
  .employee-department {
    font-size: 13px;
    font-weight: 500;
  }
  .employee-role {
    font-size: 12px;
    color: var(--muted-foreground);
    white-space: nowrap;
  }
  .employee-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 550;
    white-space: nowrap;
    background: var(--muted);
    color: var(--muted-foreground);
  }
  .employee-status > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
  .employee-status[data-status='ACTIVE'] {
    background: #ecfdf3;
    color: #087443;
  }
  .employee-status[data-status='INVITED'] {
    background: #eff6ff;
    color: #175cd3;
  }
  .employee-status[data-status='SUSPENDED'] {
    background: #fffaeb;
    color: #a15c07;
  }
  .employee-status[data-status='LEFT'] {
    background: #fff1f2;
    color: #be3455;
  }
  .directory-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    color: var(--muted-foreground);
    font-size: 12px;
  }
  .directory-empty {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 12px;
    padding: 56px 16px;
    text-align: center;
  }
  .empty-icon {
    padding: 16px;
    border-radius: 16px;
    background: var(--muted);
    color: var(--muted-foreground);
  }
  .directory-empty h3 {
    font-size: 16px;
    font-weight: 600;
  }
  .directory-empty p {
    max-width: 380px;
    color: var(--muted-foreground);
    font-size: 13px;
    line-height: 1.6;
  }
  @media (max-width: 767px) {
    .employee-directory :global(th:nth-child(n + 2):not(:last-child)),
    .employee-directory :global(td:nth-child(n + 2):not(:last-child)) {
      display: none;
    }
    .employee-identity {
      min-width: 0;
      gap: 10px;
    }
    .employee-directory :global(td) {
      padding: 16px 12px;
    }
    .employee-email {
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 210px;
    }
    .employee-mobile-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    .directory-heading,
    .directory-toolbar,
    .directory-footer {
      padding-left: 16px;
      padding-right: 16px;
    }
    .directory-tabs {
      padding: 0 16px;
      gap: 18px;
    }
    .directory-toolbar :global(.department-filter) {
      width: 100%;
    }
    .directory-footer {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
