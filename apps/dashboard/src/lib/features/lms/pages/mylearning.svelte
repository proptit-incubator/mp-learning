<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import * as UnderlineTabs from '@cio/ui/custom/underline-tabs';
  import { Button } from '@cio/ui/base/button';
  import { CoursesPage } from '$features/course/pages';
  import { profile } from '$lib/utils/store/user';
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { CoursesApi } from '$features/course/api/courses.svelte';
  import { CourseSortBy, DEFAULT_COURSE_SORT } from '$features/course/utils/constants';
  import { isStudentCourseAssigned, isStudentCourseComplete } from '$features/course/utils/student-course-progress';
  import { filterLearningCourses, prioritizeLearningCourses } from '../utils/learning-overview';

  const learningApi = new CoursesApi();
  let searchValue = $state('');
  let sortKey = $state<CourseSortBy>(DEFAULT_COURSE_SORT);
  let loadedOrganization = $state('');
  let hasLoaded = $state(false);
  const pendingCourses = $derived(learningApi.enrolledCourses.filter((course) => !isStudentCourseComplete(course)));
  const todoCourses = $derived(prioritizeLearningCourses(pendingCourses.filter(isStudentCourseAssigned)));
  const selfCourses = $derived(pendingCourses.filter((course) => !isStudentCourseAssigned(course)));
  const completedCourses = $derived(learningApi.enrolledCourses.filter(isStudentCourseComplete));
  const tabs = $derived([
    { label: $t('my_learning.tabs.todo'), value: 'todo', courses: todoCourses, empty: 'my_learning.todo_empty' },
    { label: $t('my_learning.tabs.self'), value: 'self', courses: selfCourses, empty: 'my_learning.self_empty' },
    {
      label: $t('my_learning.tabs.completed'),
      value: 'completed',
      courses: completedCourses,
      empty: 'my_learning.not_completed'
    }
  ]);
  const selectedTab = $derived(page.url.searchParams.get('tab') ?? 'todo');
  const activeTab = $derived(tabs.some((tab) => tab.value === selectedTab) ? selectedTab : 'todo');

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!$profile.id || !organizationId || loadedOrganization === organizationId) return;

    loadedOrganization = organizationId;
    untrack(() => {
      hasLoaded = false;
      void learningApi.getEnrolledCourses().finally(() => {
        hasLoaded = true;
      });
    });
  });

  function changeTab(value: string) {
    const destination = new URL(page.url);
    destination.searchParams.set('tab', value);
    void goto(destination, { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

{#if hasLoaded && learningApi.error}
  <div
    role="alert"
    class="ui:bg-danger-soft ui:text-danger-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
  >
    <p class="text-sm">{$t('mp_workspace.load_error')}</p>
    <Button variant="outline" size="sm" onclick={() => learningApi.getEnrolledCourses()}
      >{$t('mp_workspace.retry')}</Button
    >
  </div>
{/if}

<UnderlineTabs.Root value={activeTab} onValueChange={changeTab}>
  <UnderlineTabs.List class="max-w-full overflow-x-auto">
    {#each tabs as tab (tab.value)}
      <UnderlineTabs.Trigger value={tab.value}>
        {tab.label}<span
          class="ui:bg-muted ui:text-muted-foreground ml-1.5 rounded-md px-1.5 py-0.5 text-[11px] tabular-nums"
          >{hasLoaded ? tab.courses.length : '…'}</span
        >
      </UnderlineTabs.Trigger>
    {/each}
  </UnderlineTabs.List>
  {#each tabs as tab (tab.value)}
    <UnderlineTabs.Content value={tab.value}>
      {#if activeTab === tab.value}
        <CoursesPage
          bind:searchValue
          bind:sortKey
          courses={tab.value === 'todo' && sortKey === DEFAULT_COURSE_SORT
            ? filterLearningCourses(tab.courses, searchValue, sortKey, true)
            : filterLearningCourses(tab.courses, searchValue, sortKey)}
          emptyTitle={$t(searchValue ? 'mp_workspace.no_results' : tab.empty)}
          emptyDescription={$t(searchValue ? 'mp_workspace.adjust_search' : 'my_learning.any_progress')}
          isLMS={true}
          isLoading={!hasLoaded || learningApi.isLoading}
        >
          {#snippet emptyAction()}<Button variant="outline" href="/lms/explore">{$t('lms_home.open_library')}</Button
            >{/snippet}
        </CoursesPage>
      {/if}
    </UnderlineTabs.Content>
  {/each}
</UnderlineTabs.Root>
