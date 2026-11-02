<script lang="ts">
  import { untrack } from 'svelte';
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Empty } from '@cio/ui/custom/empty';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import AwardIcon from '@lucide/svelte/icons/award';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import PlayIcon from '@lucide/svelte/icons/play';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { currentOrg } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import { LearningWorkspaceApi } from '../api/learning-workspace.svelte';
  import CourseCover from '$features/course/components/course-cover.svelte';
  import UpcomingSessionsCard from '$features/lms/components/upcoming-sessions-card.svelte';
  import LibraryCourseCard from '../components/library-course-card.svelte';
  import SectionCard from '$features/ui/section-card.svelte';
  import {
    getStudentCourseDueDate,
    getStudentCourseProgressPercent,
    isStudentCourseAssigned
  } from '$features/course/utils/student-course-progress';
  import EnrollmentStateBadge from '$features/enrollment/components/enrollment-state-badge.svelte';
  import { getStudentCourseContinuePath } from '$features/course/utils/student-course-navigation';
  import { getLearningSummary } from '../utils/learning-overview';

  const learningApi = new LearningWorkspaceApi();
  let loadedOrganization = $state('');
  const now = Date.now();
  const summary = $derived(getLearningSummary(learningApi.enrolledCourses, now));
  const heroCourse = $derived(summary.pending[0] ?? null);
  const otherCourses = $derived(summary.pending.slice(1, 5));
  const heroProgress = $derived(heroCourse ? getStudentCourseProgressPercent(heroCourse) : 0);
  const upcomingSessions = $derived(
    learningApi.enrolledCourses
      .filter((course) => course.upcomingSession)
      .map((course) => ({
        lessonId: course.upcomingSession!.lessonId,
        courseTitle: course.title,
        lessonTitle: course.upcomingSession!.lessonTitle,
        callUrl: course.upcomingSession!.callUrl,
        lessonAt: course.upcomingSession!.lessonAt,
        timezone: course.upcomingSession!.sessionTimezone
      }))
      .sort(
        (leftSession, rightSession) =>
          new Date(leftSession.lessonAt).getTime() - new Date(rightSession.lessonAt).getTime()
      )
  );
  const metrics = $derived([
    {
      icon: BookOpenIcon,
      value: learningApi.enrolledCourses.length,
      label: 'mp_workspace.enrolled',
      href: '/lms/mylearning',
      tone: 'blue'
    },
    {
      icon: PlayIcon,
      value: summary.pending.length,
      label: 'my_learning.progress',
      href: '/lms/mylearning',
      tone: 'cyan'
    },
    {
      icon: CheckCheckIcon,
      value: summary.completed.length,
      label: 'my_learning.complete',
      href: '/lms/mylearning?tab=completed',
      tone: 'green'
    },
    {
      icon: ShieldCheckIcon,
      value: summary.mandatory.length,
      label: 'mp_workspace.pending_mandatory',
      href: '/lms/mylearning?tab=todo',
      tone: 'amber'
    }
  ]);

  $effect(() => {
    const organizationId = $currentOrg.id;
    const profileId = $profile.id;
    if (!organizationId || !profileId || loadedOrganization === organizationId) return;

    loadedOrganization = organizationId;
    untrack(() => void learningApi.loadWorkspace());
  });

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), { day: '2-digit', month: 'short' }).format(new Date(value));
  }
</script>

<div class="learning-workspace flex flex-col gap-6 pb-10" aria-busy={learningApi.isWorkspaceLoading}>
  {#if learningApi.loadFailed}
    <div
      role="alert"
      class="ui:bg-danger-soft ui:text-danger-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
    >
      <p class="text-sm">{$t('mp_workspace.load_error')}</p>
      <Button variant="outline" size="sm" onclick={() => learningApi.loadWorkspace()}>{$t('mp_workspace.retry')}</Button
      >
    </div>
  {/if}

  {#if !learningApi.loadFailed}
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={$t('mp_workspace.learning_snapshot')}>
      {#each metrics as metric (metric.label)}
        <a
          href={metric.href}
          class="ui:bg-card ui:shadow-card ui:hover:border-primary/40 flex items-center gap-3 rounded-xl border p-4 transition-colors md:p-5"
        >
          <span class="metric-icon" data-tone={metric.tone}
            ><metric.icon class="custom size-[18px]" strokeWidth={1.8} /></span
          >
          <span class="min-w-0">
            {#if learningApi.isWorkspaceLoading}<Skeleton class="mb-1 h-7 w-10" />{:else}<span
                class="block text-2xl leading-tight font-semibold tracking-tight tabular-nums">{metric.value}</span
              >{/if}
            <span class="ui:text-muted-foreground block text-xs leading-relaxed">{$t(metric.label)}</span>
          </span>
        </a>
      {/each}
    </section>

    {#if !learningApi.isWorkspaceLoading && summary.overdue.length > 0}
      <a
        href="/lms/mylearning?tab=todo"
        class="ui:bg-warning-soft ui:text-warning-foreground flex items-center gap-3 rounded-xl border border-current/15 px-4 py-3 text-sm"
      >
        <TriangleAlertIcon class="custom size-5 shrink-0" /><span class="flex-1"
          >{$t('mp_workspace.overdue_notice', { count: summary.overdue.length })}</span
        ><ArrowRightIcon class="size-4 shrink-0" />
      </a>
    {/if}

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      {#if learningApi.isWorkspaceLoading}
        <Skeleton class="h-[300px] w-full rounded-2xl" /><Skeleton
          class="hidden h-[300px] w-full rounded-2xl xl:block"
        />
      {:else}
        <section class="learning-focus relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl text-white">
          <svg
            class="focus-art pointer-events-none absolute right-0 bottom-0 h-full w-1/2"
            viewBox="0 0 400 340"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="310" cy="175" r="145" stroke="white" stroke-opacity=".12" /><circle
              cx="310"
              cy="175"
              r="105"
              stroke="white"
              stroke-opacity=".12"
            /><circle cx="310" cy="175" r="65" stroke="white" stroke-opacity=".12" />
            <path d="m170 340 100-340h65L235 340z" fill="white" fill-opacity=".04" /><path
              d="m235 340 100-340h30L265 340z"
              fill="#65d5f5"
              fill-opacity=".16"
            /><circle cx="212" cy="68" r="7" fill="#65d5f5" /><circle
              cx="371"
              cy="217"
              r="5"
              fill="white"
              fill-opacity=".65"
            />
          </svg>
          <div class="relative flex flex-1 flex-col items-start gap-5 p-6 sm:p-8">
            <span class="flex items-center gap-2 text-[11px] font-medium tracking-[.12em] text-white/75 uppercase"
              ><span class="size-1.5 rounded-full bg-cyan-200"></span>{$t(
                heroCourse ? 'mp_workspace.next_up' : 'mp_learning.eyebrow'
              )}</span
            >
            <div class="max-w-lg space-y-3">
              <h2 class="text-2xl leading-snug font-semibold tracking-tight text-balance sm:text-[28px]">
                {heroCourse
                  ? heroCourse.title
                  : $t(
                      learningApi.enrolledCourses.length ? 'lms_home.hero_all_done_title' : 'lms_home.hero_empty_title'
                    )}
              </h2>
              {#if heroCourse}
                {@const deadline = getStudentCourseDueDate(heroCourse)}
                <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/80">
                  <span class="inline-flex items-center gap-1.5"
                    ><BookOpenIcon class="custom size-3.5" />{$t('lms_home.lesson_count', {
                      count: heroCourse.lessonCount ?? 0
                    })}</span
                  >
                  {#if isStudentCourseAssigned(heroCourse)}<span class="inline-flex items-center gap-1.5"
                      ><ShieldCheckIcon class="custom size-3.5" />{$t('lms_home.mandatory')}</span
                    >{/if}
                  {#if deadline}<span class="inline-flex items-center gap-1.5"
                      ><CalendarClockIcon class="custom size-3.5" />{$t('enrollment.due')}: {formatDate(deadline)}</span
                    >{/if}
                </div>
              {:else}
                <p class="max-w-md text-sm leading-relaxed text-white/75">
                  {$t(
                    learningApi.enrolledCourses.length
                      ? 'lms_home.hero_all_done_description'
                      : 'lms_home.hero_empty_description'
                  )}
                </p>
              {/if}
            </div>
            {#if heroCourse}
              <div class="mt-auto flex w-full max-w-sm items-center gap-3 pt-1">
                <div
                  class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-label={$t('dashboard.progress')}
                  aria-valuenow={heroProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div class="h-full rounded-full bg-cyan-200" style:width={`${heroProgress}%`}></div>
                </div>
                <span class="text-xs font-medium tabular-nums">{heroProgress}%</span>
              </div>
              <Button
                href={getStudentCourseContinuePath(heroCourse.id)}
                class="ui:text-brand-navy ui:bg-white ui:hover:bg-white/90 gap-3"
                testId="learning-continue"
                ><PlayIcon class="size-4" />{$t('dashboard.continue_learning')}<ArrowRightIcon class="size-4" /></Button
              >
            {:else}
              <Button href="/lms/explore" class="ui:text-brand-navy ui:bg-white ui:hover:bg-white/90 mt-auto gap-3"
                ><LibraryBigIcon class="size-4" />{$t('lms_home.open_library')}<ArrowRightIcon class="size-4" /></Button
              >
            {/if}
          </div>
        </section>
        <section class="ui:bg-card ui:shadow-card flex flex-col rounded-2xl border p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold">{$t('mp_workspace.your_journey')}</h2>
            <AwardIcon class="ui:text-primary size-[18px]" />
          </div>
          <div class="relative mx-auto my-5 grid size-32 place-items-center">
            <svg viewBox="0 0 120 120" class="absolute inset-0 size-full -rotate-90" aria-hidden="true"
              ><circle cx="60" cy="60" r="52" fill="none" stroke="var(--muted)" stroke-width="7" /><circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--primary)"
                stroke-width="7"
                stroke-linecap="round"
                stroke-dasharray={`${summary.progress * 3.267} 326.73`}
              /></svg
            >
            <div class="text-center">
              <span class="block text-[28px] leading-tight font-semibold tracking-tight tabular-nums"
                >{summary.progress}%</span
              ><span class="ui:text-muted-foreground text-[10px]">{$t('dashboard.completion')}</span>
            </div>
          </div>
          <p class="ui:text-muted-foreground mb-5 text-center text-xs leading-relaxed">
            {$t('dashboard.items_done', { completed: summary.completedItems, total: summary.totalItems })}
          </p>
          <a
            href="/lms/certificates"
            class="ui:border-border ui:text-primary mt-auto flex items-center justify-between gap-3 border-t pt-4 text-xs font-medium"
            ><span>{$t('page_titles.certificates')}</span><ArrowUpRightIcon class="size-4" /></a
          >
        </section>
      {/if}
    </div>

    {#if upcomingSessions.length}<UpcomingSessionsCard sessions={upcomingSessions} />{/if}

    <div class="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <SectionCard title={$t('dashboard.currently_learning')} bodyClass="px-2! pb-2!">
        {#snippet action()}<Button variant="ghost" size="sm" class="ui:text-primary" href="/lms/mylearning"
            >{$t('dashboard.view_more')}<ArrowRightIcon class="size-3.5" /></Button
          >{/snippet}
        {#if learningApi.isWorkspaceLoading}
          <div class="space-y-3 p-3">
            {#each [0, 1, 2] as index (index)}<Skeleton class="h-20 w-full rounded-lg" />{/each}
          </div>
        {:else if otherCourses.length}
          <ul class="ui:divide-border divide-y">
            {#each otherCourses as course (course.id)}
              {@const progress = getStudentCourseProgressPercent(course)}
              <li>
                <a
                  href={getStudentCourseContinuePath(course.id)}
                  class="group ui:hover:bg-muted/60 flex items-center gap-4 rounded-lg p-3 transition-colors"
                >
                  <CourseCover
                    title={course.title}
                    src={course.bannerImage}
                    class="aspect-[4/3] w-20 shrink-0 rounded-lg"
                    initialsClass="text-sm bottom-2 left-2"
                  />
                  <div class="min-w-0 flex-1 space-y-2">
                    <p class="line-clamp-2 text-sm font-medium">{course.title}</p>
                    <div class="flex items-center gap-3">
                      <Progress value={progress} class="h-1.5 flex-1" /><span
                        class="ui:text-muted-foreground text-xs tabular-nums">{progress}%</span
                      >
                    </div>
                  </div>
                  <ChevronRightIcon class="ui:text-muted-foreground size-4 shrink-0" />
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <Empty
            class="py-5! md:p-6!"
            title={$t(heroCourse ? 'lms_home.no_other_courses' : 'dashboard.no_courses')}
            description={$t('lms_home.recommended_description')}
            icon={BookOpenIcon}
            ><Button variant="outline" size="sm" href="/lms/explore">{$t('lms_home.open_library')}</Button></Empty
          >
        {/if}
      </SectionCard>
      <SectionCard title={$t('lms_home.mandatory_title')} description={$t('lms_home.mandatory_description')}>
        {#if learningApi.isWorkspaceLoading}
          <div class="space-y-3">
            {#each [0, 1, 2] as index (index)}<Skeleton class="h-14 w-full rounded-lg" />{/each}
          </div>
        {:else if summary.mandatory.length}
          <ul class="space-y-3">
            {#each summary.mandatory.slice(0, 4) as course (course.id)}
              {@const deadline = getStudentCourseDueDate(course)}
              <li>
                <a
                  href={getStudentCourseContinuePath(course.id)}
                  class="ui:hover:bg-muted/60 flex items-start gap-3 rounded-lg py-2 transition-colors"
                >
                  <span
                    class="ui:bg-warning-soft ui:text-warning-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
                    ><ShieldCheckIcon class="custom size-4" /></span
                  >
                  <span class="min-w-0 flex-1 space-y-1.5"
                    ><span class="line-clamp-2 block text-[13px] leading-relaxed font-medium">{course.title}</span
                    >{#if deadline}<span class="ui:text-muted-foreground block text-xs"
                        >{$t('enrollment.due')}: {formatDate(deadline)}</span
                      >{/if}<EnrollmentStateBadge state={course.enrollment?.state} /></span
                  >
                </a>
              </li>
            {/each}
          </ul>
          <Button variant="outline" size="sm" class="mt-4 w-full" href="/lms/mylearning?tab=todo"
            >{$t('mp_workspace.view_mandatory')}<ArrowRightIcon class="size-3.5" /></Button
          >
        {:else}
          <div
            class="ui:bg-success-soft ui:text-success-foreground flex items-start gap-3 rounded-lg p-4 text-sm leading-relaxed"
          >
            <CheckCheckIcon class="custom mt-0.5 size-5 shrink-0" />
            <p>{$t('lms_home.mandatory_empty')}</p>
          </div>
        {/if}
      </SectionCard>
    </div>

    {#if learningApi.isWorkspaceLoading || learningApi.recommendedCourses.length}
      <section class="space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div class="space-y-1">
            <p class="ui:text-primary text-[10px] font-semibold tracking-[.12em] uppercase">
              {$t('mp_workspace.keep_growing')}
            </p>
            <h2 class="text-base font-semibold">{$t('dashboard.explore_more_courses')}</h2>
          </div>
          <Button variant="ghost" size="sm" class="ui:text-primary shrink-0" href="/lms/explore"
            >{$t('dashboard.view_more')}<ArrowRightIcon class="size-3.5" /></Button
          >
        </div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#if learningApi.isWorkspaceLoading}
            {#each [0, 1, 2] as index (index)}<Skeleton class="h-56 w-full rounded-xl" />{/each}
          {:else}
            {#each learningApi.recommendedCourses as course (course.id)}
              <LibraryCourseCard {course} />
            {/each}
          {/if}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .learning-focus {
    background: linear-gradient(115deg, #102d60, #164e9b);
  }
  .metric-icon {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: 0.75rem;
    background: var(--info-soft);
    color: var(--info-foreground);
  }
  .metric-icon[data-tone='cyan'] {
    background: var(--accent);
    color: var(--accent-foreground);
  }
  .metric-icon[data-tone='green'] {
    background: var(--success-soft);
    color: var(--success-foreground);
  }
  .metric-icon[data-tone='amber'] {
    background: var(--warning-soft);
    color: var(--warning-foreground);
  }
  .learning-workspace :global(:is(a, button):focus-visible) {
    outline: 2px solid var(--ring);
    outline-offset: 4px;
  }
  @media (max-width: 639px) {
    .focus-art {
      opacity: 0.5;
      width: 70%;
    }
  }
</style>
