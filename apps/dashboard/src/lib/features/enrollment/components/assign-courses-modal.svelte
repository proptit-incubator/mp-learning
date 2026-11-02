<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { Checkbox } from '@cio/ui/base/checkbox';
  import { Input } from '@cio/ui/base/input';
  import { Switch } from '@cio/ui/base/switch';
  import { Textarea } from '@cio/ui/base/textarea';
  import { Spinner } from '@cio/ui/base/spinner';
  import { Search } from '@cio/ui/custom/search';
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CheckIcon from '@lucide/svelte/icons/check';
  import UserIcon from '@lucide/svelte/icons/user';
  import UsersIcon from '@lucide/svelte/icons/users';
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { snackbar } from '$features/ui/snackbar/store';
  import { EnrollmentApi } from '../api/enrollment.svelte';

  type Props = {
    open: boolean;
    courseIds?: string[];
    courseTitle?: string;
    employeeIds?: string[];
    employeeLabel?: string;
    onAssigned?: () => void;
  };

  type RecipientMode = 'individual' | 'groups' | 'everyone';
  type DuePreset = 'none' | 'week' | 'two_weeks' | 'month' | 'custom';

  let {
    open = $bindable(false),
    courseIds: fixedCourseIds,
    courseTitle,
    employeeIds: fixedEmployeeIds,
    employeeLabel,
    onAssigned
  }: Props = $props();

  const api = new EnrollmentApi();
  const selectedCourseIds = new SvelteSet<string>();
  const selectedEmployeeIds = new SvelteSet<string>();
  const selectedDepartments = new SvelteSet<string>();
  const selectedJobTitles = new SvelteSet<string>();
  let mode = $state<RecipientMode>('individual');
  let duePreset = $state<DuePreset>('none');
  let customDueDay = $state('');
  let batchLabel = $state('');
  let message = $state('');
  let sendEmail = $state(true);
  let initializedFor = '';
  let previewTimer: ReturnType<typeof setTimeout> | undefined;

  const courseSearch = new DebouncedSearch({ onApply: (value) => void api.searchCourses(value) });
  const employeeSearch = new DebouncedSearch({ onApply: (value) => void api.searchEmployees(value) });

  const pickCourses = $derived(!fixedCourseIds?.length);
  const pickEmployees = $derived(!fixedEmployeeIds?.length);
  const courseIds = $derived(pickCourses ? [...selectedCourseIds] : (fixedCourseIds ?? []));
  const assignedIds = $derived(new Set(api.preview?.assignedEmployeeIds ?? []));
  const visibleSelectable = $derived(api.employees.filter((employee) => !assignedIds.has(employee.id)));
  const allVisibleSelected = $derived(
    visibleSelectable.length > 0 && visibleSelectable.every((employee) => selectedEmployeeIds.has(employee.id))
  );

  const recipientPayload = $derived.by(() => {
    if (!pickEmployees) return { employeeIds: fixedEmployeeIds ?? [] };
    if (mode === 'everyone') return { filter: { all: true } };
    if (mode === 'groups') {
      return { filter: { departments: [...selectedDepartments], jobTitles: [...selectedJobTitles] } };
    }
    return { employeeIds: [...selectedEmployeeIds] };
  });

  const hasRecipients = $derived(
    !pickEmployees ||
      mode === 'everyone' ||
      (mode === 'groups' && selectedDepartments.size + selectedJobTitles.size > 0) ||
      (mode === 'individual' && selectedEmployeeIds.size > 0)
  );
  const recipients = $derived(hasRecipients ? (api.preview?.recipients ?? null) : 0);
  const canSubmit = $derived(courseIds.length > 0 && hasRecipients && (recipients ?? 1) > 0 && !api.isLoading);

  function addDays(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  const dueDay = $derived(
    duePreset === 'week'
      ? addDays(7)
      : duePreset === 'two_weeks'
        ? addDays(14)
        : duePreset === 'month'
          ? addDays(30)
          : duePreset === 'custom'
            ? customDueDay
            : ''
  );

  function formatDay(day: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'full' }).format(new Date(`${day}T00:00:00`));
  }

  $effect(() => {
    const key = open ? `${fixedCourseIds?.join(',') ?? ''}|${fixedEmployeeIds?.join(',') ?? ''}` : '';
    if (key === initializedFor) return;

    initializedFor = key;
    if (!open) return;

    untrack(() => {
      selectedCourseIds.clear();
      selectedEmployeeIds.clear();
      selectedDepartments.clear();
      selectedJobTitles.clear();
      mode = 'individual';
      duePreset = 'none';
      customDueDay = '';
      batchLabel = '';
      message = '';
      sendEmail = true;
      api.errors = {};
      api.preview = null;
      courseSearch.reset();
      employeeSearch.reset();
      if (pickCourses) void api.searchCourses();
      if (pickEmployees) {
        void api.loadFacets();
        void api.searchEmployees();
      }
    });
  });

  $effect(() => {
    if (!open || !courseIds.length) return;

    const payload = { courseIds, ...recipientPayload };
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => void api.loadPreview(payload), 250);
    return () => clearTimeout(previewTimer);
  });

  function toggle(set: SvelteSet<string>, id: string) {
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }

  function toggleAllVisible() {
    const select = !allVisibleSelected;
    for (const employee of visibleSelectable) {
      if (select) selectedEmployeeIds.add(employee.id);
      else selectedEmployeeIds.delete(employee.id);
    }
  }

  async function submit() {
    const payload = {
      courseIds,
      ...recipientPayload,
      dueDate: dueDay ? new Date(`${dueDay}T23:59:00`).toISOString() : null,
      batchLabel: batchLabel.trim() || null,
      message,
      sendEmail
    };
    const result = await api.assign(payload);
    if (!result) return;

    snackbar.success($t('enrollment.assigned_result', { assigned: result.assigned, existing: result.existing }));
    open = false;
    onAssigned?.();
  }

  const modes: Array<{ value: RecipientMode; label: string; icon: typeof UserIcon }> = $derived([
    { value: 'individual', label: $t('enrollment.mode.individual'), icon: UserIcon },
    { value: 'groups', label: $t('enrollment.mode.groups'), icon: Building2Icon },
    { value: 'everyone', label: $t('enrollment.mode.everyone'), icon: UsersIcon }
  ]);
  const duePresets: Array<{ value: DuePreset; label: string }> = $derived([
    { value: 'none', label: $t('enrollment.due_presets.none') },
    { value: 'week', label: $t('enrollment.due_presets.week') },
    { value: 'two_weeks', label: $t('enrollment.due_presets.two_weeks') },
    { value: 'month', label: $t('enrollment.due_presets.month') },
    { value: 'custom', label: $t('enrollment.due_presets.custom') }
  ]);
</script>

{#snippet chip(label: string, count: number | undefined, selected: boolean, onclick: () => void)}
  <button
    type="button"
    aria-pressed={selected}
    class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors {selected
      ? 'ui:border-primary ui:bg-primary/10 ui:text-primary font-medium'
      : 'ui:bg-card ui:hover:bg-muted'}"
    {onclick}
  >
    {#if selected}<CheckIcon class="size-3.5" />{/if}
    {label}
    {#if count !== undefined}<span class="ui:text-muted-foreground text-xs tabular-nums">{count}</span>{/if}
  </button>
{/snippet}

<Dialog.Root bind:open>
  <Dialog.Content class="flex h-[min(760px,92vh)] w-[96vw] max-w-5xl! flex-col gap-0 overflow-hidden p-0">
    <Dialog.Header class="ui:border-border border-b px-6 py-4">
      <Dialog.Title>{$t('enrollment.assign_title')}</Dialog.Title>
      <Dialog.Description>
        {#if !pickCourses}
          {$t('enrollment.assign_subtitle_course', { course: courseTitle ?? '' })}
        {:else if !pickEmployees}
          {$t('enrollment.assign_subtitle_people', {
            people: employeeLabel ?? $t('enrollment.people_count', { count: fixedEmployeeIds?.length ?? 0 })
          })}
        {:else}
          {$t('enrollment.assign_description')}
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    <div class="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_340px]">
      <section class="flex min-h-0 flex-col">
        {#if pickCourses}
          <div class="space-y-3 px-6 pt-5 pb-3">
            <h3 class="text-sm font-semibold">{$t('enrollment.pick_courses_title')}</h3>
            <Search
              class="w-full! max-w-none!"
              placeholder={$t('enrollment.pick_courses')}
              value={courseSearch.draft}
              onValueChange={(value) => courseSearch.input(value)}
            />
          </div>
          <ul class="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4" aria-busy={api.isSearchingCourses}>
            {#each api.courses as course (course.id)}
              {@const selected = selectedCourseIds.has(course.id)}
              <li>
                <label
                  class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 {selected
                    ? 'ui:bg-primary/5'
                    : 'ui:hover:bg-muted'}"
                >
                  <Checkbox checked={selected} onCheckedChange={() => toggle(selectedCourseIds, course.id)} />
                  <span class="ui:bg-muted grid size-9 shrink-0 place-items-center rounded-md"
                    ><BookOpenIcon class="ui:text-muted-foreground size-4" /></span
                  >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{course.title}</span>
                    {#if course.description}<span class="ui:text-muted-foreground block truncate text-xs"
                        >{course.description}</span
                      >{/if}
                  </span>
                </label>
              </li>
            {:else}
              <li class="ui:text-muted-foreground py-10 text-center text-sm">
                {api.isSearchingCourses ? '…' : $t('enrollment.no_courses')}
              </li>
            {/each}
          </ul>
        {:else}
          <div class="space-y-4 px-6 pt-5 pb-3">
            <h3 class="text-sm font-semibold">{$t('enrollment.recipients')}</h3>
            <div class="ui:bg-muted grid grid-cols-3 gap-1 rounded-lg p-1" role="tablist">
              {#each modes as option (option.value)}
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === option.value}
                  class="flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors {mode ===
                  option.value
                    ? 'ui:bg-card ui:text-foreground shadow-sm'
                    : 'ui:text-muted-foreground ui:hover:text-foreground'}"
                  onclick={() => (mode = option.value)}
                >
                  <option.icon class="size-4" />
                  <span class="truncate">{option.label}</span>
                </button>
              {/each}
            </div>
          </div>

          {#if mode === 'individual'}
            <div class="flex items-center gap-3 px-6 pb-2">
              <Search
                class="w-full! max-w-none! flex-1"
                placeholder={$t('enrollment.pick_employees')}
                value={employeeSearch.draft}
                onValueChange={(value) => employeeSearch.input(value)}
              />
              <Button variant="ghost" size="sm" onclick={toggleAllVisible} disabled={!visibleSelectable.length}>
                {$t(allVisibleSelected ? 'enrollment.clear_visible' : 'enrollment.select_visible')}
              </Button>
            </div>
            {#if selectedEmployeeIds.size}
              <p class="ui:text-muted-foreground px-6 pb-2 text-xs">
                {$t('enrollment.selected_people', { count: selectedEmployeeIds.size })} ·
                <button type="button" class="ui:text-primary underline" onclick={() => selectedEmployeeIds.clear()}
                  >{$t('enrollment.clear')}</button
                >
              </p>
            {/if}
            <ul class="min-h-0 flex-1 overflow-y-auto px-4 pb-4" aria-busy={api.isSearchingEmployees}>
              {#each api.employees as employee (employee.id)}
                {@const assigned = assignedIds.has(employee.id)}
                {@const selected = selectedEmployeeIds.has(employee.id)}
                <li>
                  <label
                    class="flex items-center gap-3 rounded-lg px-2 py-2 {assigned
                      ? 'opacity-60'
                      : selected
                        ? 'ui:bg-primary/5 cursor-pointer'
                        : 'ui:hover:bg-muted cursor-pointer'}"
                  >
                    <Checkbox
                      checked={selected || assigned}
                      disabled={assigned}
                      onCheckedChange={() => toggle(selectedEmployeeIds, employee.id)}
                    />
                    <UserAvatar src={employee.avatarUrl} alt={employee.fullname} class="size-8 shrink-0" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-medium">{employee.fullname}</span>
                      <span class="ui:text-muted-foreground block truncate text-xs">
                        {employee.employeeCode}{employee.department
                          ? ` · ${employee.department}`
                          : ''}{employee.jobTitle ? ` · ${employee.jobTitle}` : ''}
                      </span>
                    </span>
                    {#if assigned}
                      <span class="ui:bg-muted ui:text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs"
                        >{$t('enrollment.already_assigned')}</span
                      >
                    {/if}
                  </label>
                </li>
              {:else}
                <li class="ui:text-muted-foreground py-10 text-center text-sm">
                  {api.isSearchingEmployees ? '…' : $t('enrollment.no_employees')}
                </li>
              {/each}
            </ul>
          {:else if mode === 'groups'}
            <div class="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-6">
              <p class="ui:text-muted-foreground text-sm">{$t('enrollment.groups_hint')}</p>
              <div class="space-y-2">
                <h4 class="ui:text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {$t('enrollment.filter_department')}
                </h4>
                <div class="flex flex-wrap gap-2">
                  {#each api.facets?.departments ?? [] as department (department)}
                    {@render chip(
                      department,
                      api.facets?.departmentCounts?.[department],
                      selectedDepartments.has(department),
                      () => toggle(selectedDepartments, department)
                    )}
                  {/each}
                </div>
              </div>
              <div class="space-y-2">
                <h4 class="ui:text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {$t('enrollment.filter_job_title')}
                </h4>
                <div class="flex flex-wrap gap-2">
                  {#each api.facets?.jobTitles ?? [] as jobTitle (jobTitle)}
                    {@render chip(
                      jobTitle,
                      api.facets?.jobTitleCounts?.[jobTitle],
                      selectedJobTitles.has(jobTitle),
                      () => toggle(selectedJobTitles, jobTitle)
                    )}
                  {/each}
                </div>
              </div>
            </div>
          {:else}
            <div class="px-6 pb-6">
              <div class="ui:bg-muted/50 flex items-start gap-3 rounded-xl border p-5">
                <span class="ui:bg-primary/10 ui:text-primary grid size-10 shrink-0 place-items-center rounded-lg"
                  ><UsersIcon class="size-5" /></span
                >
                <div class="space-y-1">
                  <p class="font-medium">
                    {$t('enrollment.everyone_title', { count: api.facets?.assignableEmployees ?? 0 })}
                  </p>
                  <p class="ui:text-muted-foreground text-sm">{$t('enrollment.everyone_hint')}</p>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </section>

      <aside
        class="ui:border-border ui:bg-muted/30 min-h-0 space-y-5 overflow-y-auto border-t px-6 py-5 md:border-t-0 md:border-l"
      >
        {#if !pickCourses}
          <div class="space-y-1.5">
            <p class="ui:text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {$t('enrollment.courses')}
            </p>
            <p class="flex items-center gap-2 text-sm font-medium">
              <BookOpenIcon class="ui:text-muted-foreground size-4 shrink-0" />{courseTitle}
            </p>
          </div>
        {:else if !pickEmployees}
          <div class="space-y-1.5">
            <p class="ui:text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {$t('enrollment.employees')}
            </p>
            <p class="flex items-center gap-2 text-sm font-medium">
              <UsersIcon class="ui:text-muted-foreground size-4 shrink-0" />{employeeLabel ??
                $t('enrollment.selected_people', { count: fixedEmployeeIds?.length ?? 0 })}
            </p>
          </div>
        {/if}

        <div class="space-y-2">
          <p class="text-sm font-medium">{$t('enrollment.due_date')}</p>
          <div class="flex flex-wrap gap-1.5">
            {#each duePresets as preset (preset.value)}
              <button
                type="button"
                aria-pressed={duePreset === preset.value}
                class="rounded-md border px-2.5 py-1 text-xs transition-colors {duePreset === preset.value
                  ? 'ui:border-primary ui:bg-primary ui:text-primary-foreground'
                  : 'ui:bg-card ui:hover:bg-muted'}"
                onclick={() => (duePreset = preset.value)}>{preset.label}</button
              >
            {/each}
          </div>
          {#if duePreset === 'custom'}
            <Input type="date" bind:value={customDueDay} min={addDays(0)} />
          {/if}
          <p class="ui:text-muted-foreground text-xs">
            {dueDay ? $t('enrollment.due_on', { date: formatDay(dueDay) }) : $t('enrollment.due_none_hint')}
          </p>
        </div>

        <div class="space-y-2">
          <label for="assign-batch-label" class="text-sm font-medium">{$t('enrollment.batch_label')}</label>
          <Input
            id="assign-batch-label"
            name="assign-batch-label"
            placeholder={$t('enrollment.batch_placeholder')}
            bind:value={batchLabel}
          />
          <p class="ui:text-muted-foreground text-xs">{$t('enrollment.batch_hint')}</p>
        </div>

        <div class="space-y-2">
          <label for="assign-message" class="text-sm font-medium">{$t('enrollment.message')}</label>
          <Textarea
            id="assign-message"
            rows={3}
            bind:value={message}
            placeholder={$t('enrollment.message_placeholder')}
          />
        </div>

        <div class="ui:bg-card flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
          <label for="assign-notify" class="text-sm">{$t('enrollment.notify')}</label>
          <Switch id="assign-notify" bind:checked={sendEmail} />
        </div>
      </aside>
    </div>

    <footer
      class="ui:border-border ui:bg-card flex flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-h-5 text-sm" aria-live="polite">
        {#if !courseIds.length}
          <span class="ui:text-muted-foreground">{$t('enrollment.summary_pick_course')}</span>
        {:else if !hasRecipients}
          <span class="ui:text-muted-foreground">{$t('enrollment.summary_pick_people')}</span>
        {:else if api.preview}
          <span class="inline-flex items-center gap-2">
            {#if api.isPreviewing}<Spinner class="size-3.5" />{/if}
            <span>
              {$t('enrollment.summary', { people: api.preview.recipients, courses: courseIds.length })}
              {#if api.preview.existingAssignments}
                <span class="ui:text-muted-foreground">
                  · {$t('enrollment.summary_existing', { count: api.preview.existingAssignments })}</span
                >
              {/if}
            </span>
          </span>
        {:else}
          <Spinner class="size-3.5" />
        {/if}
      </div>
      <div class="flex justify-end gap-2">
        <Button variant="outline" onclick={() => (open = false)}>{$t('common.cancel')}</Button>
        <Button testId="assign-courses-submit" onclick={submit} loading={api.isLoading} disabled={!canSubmit}>
          {recipients ? $t('enrollment.submit_count', { count: recipients }) : $t('enrollment.submit')}
        </Button>
      </div>
    </footer>
  </Dialog.Content>
</Dialog.Root>
