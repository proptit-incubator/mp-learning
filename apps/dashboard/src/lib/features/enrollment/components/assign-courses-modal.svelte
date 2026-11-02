<script lang="ts">
  import { untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Select from '@cio/ui/base/select';
  import { Button } from '@cio/ui/base/button';
  import { Badge } from '@cio/ui/base/badge';
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { MultiSelectList } from '@cio/ui/custom/multi-select-list';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { t } from '$lib/utils/functions/translations';
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
  let everyone = $state(false);
  let dueDate = $state('');
  let batchLabel = $state('');
  let message = $state('');
  let sendEmail = $state(true);
  let initializedFor = '';

  const courseSearch = new DebouncedSearch({ onApply: (value) => void api.searchCourses(value) });
  const employeeSearch = new DebouncedSearch({ onApply: (value) => void api.searchEmployees(value) });

  const pickCourses = $derived(!fixedCourseIds?.length);
  const pickEmployees = $derived(!fixedEmployeeIds?.length);
  const courseItems = $derived(
    api.courses.map((course) => ({ id: course.id, label: course.title, description: course.description ?? '' }))
  );
  const employeeItems = $derived(
    api.employees.map((employee) => ({
      id: employee.id,
      label: employee.fullname,
      description: `${employee.employeeCode} · ${employee.department || $t('employees.unassigned')}`
    }))
  );
  const targetCount = $derived(
    everyone ? null : selectedEmployeeIds.size + selectedDepartments.size + selectedJobTitles.size
  );
  const canSubmit = $derived(
    (pickCourses ? selectedCourseIds.size > 0 : true) &&
      (pickEmployees ? everyone || (targetCount ?? 0) > 0 : true) &&
      !api.isLoading
  );

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
      everyone = false;
      dueDate = '';
      batchLabel = '';
      message = '';
      sendEmail = true;
      api.errors = {};
      courseSearch.reset();
      employeeSearch.reset();
      if (pickCourses) void api.searchCourses();
      if (pickEmployees) {
        void api.loadFacets();
        void api.searchEmployees();
      }
    });
  });

  function toggle(set: SvelteSet<string>, id: string) {
    if (set.has(id)) set.delete(id);
    else set.add(id);
  }

  async function submit() {
    const payload = {
      courseIds: pickCourses ? [...selectedCourseIds] : (fixedCourseIds ?? []),
      employeeIds: pickEmployees ? [...selectedEmployeeIds] : (fixedEmployeeIds ?? []),
      filter: pickEmployees
        ? { departments: [...selectedDepartments], jobTitles: [...selectedJobTitles], all: everyone }
        : undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
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
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[85vh] w-[96vw] max-w-3xl! overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{$t('enrollment.assign_title')}</Dialog.Title>
      <Dialog.Description>{$t('enrollment.assign_description')}</Dialog.Description>
    </Dialog.Header>

    <section class="space-y-2">
      <h3 class="text-sm font-semibold">{$t('enrollment.courses')}</h3>
      {#if pickCourses}
        <MultiSelectList
          items={courseItems}
          isLoading={api.isSearchingCourses}
          isSelected={(id) => selectedCourseIds.has(id)}
          onToggle={(id) => toggle(selectedCourseIds, id)}
          bind:searchValue={courseSearch.draft}
          onSearchValueChange={(value) => courseSearch.input(value)}
          searchPlaceholder={$t('enrollment.pick_courses')}
          emptyMessage={$t('course.search.empty')}
          namePrefix="assign-course"
          listClass="max-h-48"
        />
      {:else}
        <Badge variant="secondary"
          >{courseTitle ?? $t('enrollment.selected_count', { count: fixedCourseIds?.length ?? 0 })}</Badge
        >
      {/if}
    </section>

    <section class="space-y-2">
      <h3 class="text-sm font-semibold">{$t('enrollment.employees')}</h3>
      {#if pickEmployees}
        <CheckboxField name="assign-everyone" label={$t('enrollment.all_employees')} bind:checked={everyone} />
        {#if !everyone}
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <p class="ui:text-muted-foreground text-xs">{$t('enrollment.filter_department')}</p>
              <div class="flex flex-wrap gap-1">
                {#each api.facets?.departments ?? [] as department (department)}
                  <button
                    type="button"
                    class="rounded-full border px-2 py-0.5 text-xs {selectedDepartments.has(department)
                      ? 'ui:bg-primary ui:text-primary-foreground ui:border-primary'
                      : 'ui:bg-card'}"
                    onclick={() => toggle(selectedDepartments, department)}>{department}</button
                  >
                {/each}
              </div>
            </div>
            <div class="space-y-1">
              <p class="ui:text-muted-foreground text-xs">{$t('enrollment.filter_job_title')}</p>
              <div class="flex flex-wrap gap-1">
                {#each api.facets?.jobTitles ?? [] as jobTitle (jobTitle)}
                  <button
                    type="button"
                    class="rounded-full border px-2 py-0.5 text-xs {selectedJobTitles.has(jobTitle)
                      ? 'ui:bg-primary ui:text-primary-foreground ui:border-primary'
                      : 'ui:bg-card'}"
                    onclick={() => toggle(selectedJobTitles, jobTitle)}>{jobTitle}</button
                  >
                {/each}
              </div>
            </div>
          </div>
          <MultiSelectList
            items={employeeItems}
            isLoading={api.isSearchingEmployees}
            isSelected={(id) => selectedEmployeeIds.has(id)}
            onToggle={(id) => toggle(selectedEmployeeIds, id)}
            bind:searchValue={employeeSearch.draft}
            onSearchValueChange={(value) => employeeSearch.input(value)}
            searchPlaceholder={$t('enrollment.pick_employees')}
            emptyMessage={$t('employees.empty_hint')}
            namePrefix="assign-employee"
            listClass="max-h-48"
          />
        {/if}
      {:else}
        <Badge variant="secondary"
          >{employeeLabel ?? $t('enrollment.selected_count', { count: fixedEmployeeIds?.length ?? 0 })}</Badge
        >
      {/if}
    </section>

    <div class="grid gap-3 sm:grid-cols-2">
      <InputField
        name="assign-due-date"
        type="datetime-local"
        label={$t('enrollment.due_date')}
        bind:value={dueDate}
        errorMessage={api.errors.dueDate}
        onInput={() => delete api.errors.dueDate}
      />
      <InputField
        name="assign-batch-label"
        label={$t('enrollment.batch_label')}
        placeholder={$t('enrollment.batch_placeholder')}
        bind:value={batchLabel}
        errorMessage={api.errors.batchLabel}
        onInput={() => delete api.errors.batchLabel}
      />
    </div>
    <TextareaField name="assign-message" label={$t('enrollment.message')} bind:value={message} rows={3} />
    <CheckboxField name="assign-notify" label={$t('enrollment.notify')} bind:checked={sendEmail} />

    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={() => (open = false)}>{$t('common.cancel')}</Button>
      <Button size="sm" testId="assign-courses-submit" onclick={submit} loading={api.isLoading} disabled={!canSubmit}>
        {$t('enrollment.submit')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
