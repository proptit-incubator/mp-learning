<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { MultiSelectList } from '@cio/ui/custom/multi-select-list';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { currentOrg, currentOrgPath } from '$lib/utils/store/org';
  import { courseApi } from '$features/course/api';
  import { PeopleApi } from '$features/course/api/people.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { ROLE } from '@cio/utils/constants';

  let { onMembersChanged }: { onMembersChanged?: () => void } = $props();
  const peopleApi = new PeopleApi();
  const selectedIds = new SvelteSet<string>();
  const search = new DebouncedSearch({
    onApply: (value) => {
      void peopleApi.listAvailableEmployees(courseId, value);
    }
  });
  const courseId = $derived(courseApi.course?.id ?? '');
  const isOpen = $derived(page.url.searchParams.get('add') === 'staff');
  let sendEmail = $state(true);
  let loadedContext = '';
  const availableEmployees = $derived(peopleApi.availableEmployees);
  const items = $derived(
    (availableEmployees ?? [])
      .filter((employee) => ['ADMIN', 'TUTOR'].includes(employee.role))
      .flatMap((employee) =>
        employee.profileId
          ? [
              {
                id: employee.profileId,
                label: employee.name,
                description: `${employee.employeeCode} · ${employee.email}`
              }
            ]
          : []
      )
  );

  function closeModal() {
    search.reset();
    goto(resolve(page.url.pathname, {}));
  }

  function toggleEmployee(profileId: string) {
    if (selectedIds.has(profileId)) {
      selectedIds.delete(profileId);
      return;
    }

    selectedIds.add(profileId);
  }

  async function addStaff() {
    const members = [...selectedIds].map((profileId) => ({ profileId, roleId: ROLE.TUTOR }));
    const response = await peopleApi.add(courseId, members, sendEmail);
    if (!response) return;

    selectedIds.clear();
    onMembersChanged?.();
    closeModal();
  }

  $effect(() => {
    const context = isOpen && courseId && $currentOrg.id ? `${courseId}:${$currentOrg.id}` : '';
    if (context === loadedContext) return;

    loadedContext = context;
    if (!context) return;

    untrack(() => {
      search.reset();
      sendEmail = true;
      peopleApi.errors = {};
      selectedIds.clear();
      peopleApi.availableEmployees = null;
      void peopleApi.listAvailableEmployees(courseId);
    });
  });

  onDestroy(() => search.destroy());
</script>

<Dialog.Root
  open={isOpen}
  onOpenChange={(open) => {
    if (!open) closeModal();
  }}
>
  <Dialog.Content class="max-h-[80vh] w-[96vw] max-w-2xl! overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{$t('course.employee_enrollment.instructors')}</Dialog.Title>
    </Dialog.Header>
    <MultiSelectList
      {items}
      isLoading={!availableEmployees || peopleApi.isLoading}
      isSelected={(id) => selectedIds.has(id)}
      onToggle={toggleEmployee}
      bind:searchValue={search.draft}
      onSearchValueChange={(value) => search.input(value)}
      searchPlaceholder={$t('course.employee_enrollment.search')}
      emptyMessage={$t('course.employee_enrollment.empty')}
      namePrefix="course-staff"
      listClass="max-h-64"
    />
    <p class="ui:text-muted-foreground text-sm">
      {$t('course.employee_enrollment.manage_hint')}
      <a class="ui:text-primary underline" href={`${$currentOrgPath}/employees`}>{$t('employees.title')}</a>
    </p>
    <CheckboxField
      name="notify-course-staff"
      label={$t('course.employee_enrollment.notify')}
      bind:checked={sendEmail}
    />
    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={closeModal}>{$t('common.cancel')}</Button>
      <Button
        size="sm"
        onclick={addStaff}
        loading={peopleApi.isLoading}
        disabled={!selectedIds.size || peopleApi.isLoading}
      >
        {$t('course.employee_enrollment.instructors')} ({selectedIds.size})
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
