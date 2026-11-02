<script lang="ts">
  import * as Page from '@cio/ui/base/page';
  import { Button } from '@cio/ui/base/button';
  import { Badge } from '@cio/ui/base/badge';
  import { SafeHtmlContent } from '@cio/ui/custom/safe-html-content';
  import CourseCover from '$features/course/components/course-cover.svelte';
  import HTMLRender from '$features/ui/html-render.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { LibraryApi } from '$features/lms/api/library.svelte';
  import { getStudentCourseContinuePath } from '$features/course/utils/student-course-navigation';

  let { data } = $props();
  const libraryApi = new LibraryApi();
</script>

<svelte:head><title>{data.course.title} · MP Learning</title></svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('lms_navigation.explore')}</Page.Eyebrow>
      <Page.Title>{data.course.title}</Page.Title>
      <Page.Subtitle>{data.course.description}</Page.Subtitle>
    </Page.HeaderContent>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0 space-y-6">
          <CourseCover
            title={data.course.title}
            src={data.course.bannerImage}
            class="aspect-[16/7] w-full rounded-xl"
          />
          {#if data.course.goals}
            <section class="space-y-3">
              <h2 class="text-lg font-semibold">{$t('training_library.goals')}</h2>
              <HTMLRender disableMaxWidth={true}><SafeHtmlContent content={data.course.goals} /></HTMLRender>
            </section>
          {/if}
          {#if data.course.requirements}
            <section class="space-y-3">
              <h2 class="text-lg font-semibold">{$t('course.navItem.landing_page.requirement')}</h2>
              <HTMLRender disableMaxWidth={true}><SafeHtmlContent content={data.course.requirements} /></HTMLRender>
            </section>
          {/if}
        </div>
        <aside class="ui:bg-card space-y-4 rounded-xl border p-5">
          <Badge variant="secondary"
            >{$t(
              data.course.isEnrolled
                ? 'training_library.enrolled'
                : data.course.hasAccess
                  ? 'training_library.available_to_you'
                  : 'training_library.self_enrollment'
            )}</Badge
          >
          <p class="text-sm">{$t('lms_home.lesson_count', { count: data.course.lessonCount })}</p>
          <p class="text-sm">{$t('training_library.exercise_count', { count: data.course.exerciseCount })}</p>
          {#if data.course.recertificationMonths}
            <p class="text-sm">
              {$t('enrollment.recertification.every', { months: data.course.recertificationMonths })}
            </p>
          {/if}
          {#if data.course.hasAccess}
            <Button class="w-full" href={getStudentCourseContinuePath(data.course.id)}
              >{$t('training_library.start_continue')}</Button
            >
          {:else if data.course.canSelfEnroll}
            <p class="ui:text-muted-foreground text-sm">{$t('training_library.self_enrollment_hint')}</p>
            <Button class="w-full" loading={libraryApi.isEnrolling} onclick={() => libraryApi.enroll(data.course)}
              >{$t('training_library.enroll')}</Button
            >
          {:else}
            <p class="ui:text-muted-foreground text-sm">{$t('training_library.assigned_only_hint')}</p>
          {/if}
          {#if libraryApi.enrollmentFailed}
            <p role="alert" class="ui:text-danger-foreground text-sm">{$t('training_library.enrollment_error')}</p>
          {/if}
          <Button class="w-full" variant="outline" href="/lms/explore">{$t('training_library.back')}</Button>
        </aside>
      </div>
    {/snippet}
  </Page.Body>
</Page.Root>
