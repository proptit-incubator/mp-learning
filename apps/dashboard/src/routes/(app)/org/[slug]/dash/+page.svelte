<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import AwardIcon from '@lucide/svelte/icons/award';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import UsersIcon from '@lucide/svelte/icons/users';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import { Skeleton } from '@cio/ui/base/skeleton';

  import { t } from '$lib/utils/functions/translations';
  import { calDateDiff, getGreeting } from '$lib/utils/functions/date';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { currentOrgPath, isOrgAdmin, isOrgTeamMember } from '$lib/utils/store/org';

  import { CreateCourseButton } from '$features/course/components';
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import { Progress } from '@cio/ui/base/progress';
  import { Button } from '@cio/ui/base/button';
  import { ActivityCard } from '$features/ui';
  import SectionCard from '$features/ui/section-card.svelte';
  import LoginActivityChart from '$features/org/components/login-activity-chart.svelte';
  import * as Page from '@cio/ui/base/page';
  import { Empty } from '@cio/ui/custom/empty';
  import { profile } from '$lib/utils/store/user';

  const { data } = $props();

  const stats = $derived(data.stats);
  const loginActivity = $derived(data.loginActivity);
  const recentCertifications = $derived(stats?.recentCertifications || []);
  const numberOfCourses = $derived(stats?.numberOfCourses ?? '—');
  const totalCertificates = $derived(stats?.totalCertificates ?? '—');
  const totalStudents = $derived(stats?.totalStudents ?? '—');
  const topCourses = $derived(stats?.topCourses || []);
  const firstName = $derived($profile.fullname?.trim().split(/\s+/).at(-1) ?? '');

  const todayLabel = new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const quickActions = $derived(
    [
      {
        icon: UserPlusIcon,
        titleKey: 'dashboard.quick_actions.add_learners',
        descriptionKey: 'dashboard.quick_actions.add_learners_description',
        href: `${$currentOrgPath}/employees?action=create`,
        adminOnly: true
      },
      {
        icon: UploadIcon,
        titleKey: 'dashboard.quick_actions.upload_documents',
        descriptionKey: 'dashboard.quick_actions.upload_documents_description',
        href: `${$currentOrgPath}/media`,
        adminOnly: false
      }
    ].filter((action) => !action.adminOnly || $isOrgAdmin)
  );
</script>

<svelte:head>
  <title>{$t('org_navigation.dashboard')} · MP Learning</title>
</svelte:head>

<Page.Root class="w-full pb-10">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow class="first-letter:uppercase">{todayLabel}</Page.Eyebrow>
      <Page.Title>
        {$t(getGreeting())}{#if firstName}, {firstName}{/if}
      </Page.Title>
      <Page.Subtitle>{$t('dashboard.org_overview_description')}</Page.Subtitle>
    </Page.HeaderContent>
    <Page.Action>
      <CreateCourseButton isResponsive />
    </Page.Action>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <section class="ui:bg-brand-navy relative overflow-hidden rounded-2xl p-6 text-white md:p-8">
        <svg
          class="pointer-events-none absolute inset-y-0 right-0 h-full w-72 opacity-20"
          viewBox="0 0 280 180"
          fill="none"
          aria-hidden="true"
          ><path d="M80 180 140 0h55l-60 180z" fill="#38bdf8" /><path
            d="M145 180 205 0h30l-60 180z"
            fill="white"
          /><circle cx="245" cy="90" r="74" stroke="white" /></svg
        >
        <div class="relative flex flex-wrap items-center justify-between gap-6">
          <div class="max-w-xl space-y-2">
            <p class="text-[10px] font-medium tracking-[.14em] text-cyan-200 uppercase">
              MP TRANSFORMATION · {$t('mp_learning.context_admin')}
            </p>
            <h2 class="text-xl leading-snug font-semibold tracking-tight sm:text-2xl">
              {$t('mp_workspace.operations_title')}
            </h2>
            <p class="max-w-lg text-sm leading-relaxed text-white/70">{$t('mp_workspace.operations_description')}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            href={`${$currentOrgPath}/courses`}
            class="ui:bg-white ui:text-brand-navy ui:hover:bg-white/90 shrink-0"
          >
            <BookOpenIcon class="size-4" />{$t('dashboard.view_courses')}<ArrowUpRightIcon class="size-4" />
          </Button>
        </div>
      </section>
      {#if !stats}
        <p role="alert" class="ui:bg-warning-soft ui:text-warning-foreground rounded-xl p-4 text-sm">
          {$t('mp_workspace.load_error')}
        </p>
      {/if}
      <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <ActivityCard
          activity={{
            icon: UsersIcon,
            title: $t('dashboard.total_students'),
            percentage: totalStudents ?? 0,
            description: $t('dashboard.total_students_description'),
            hidePercentage: true,
            href: $isOrgTeamMember ? resolve(`${$currentOrgPath}/employees`, {}) : undefined
          }}
        />
        <ActivityCard
          activity={{
            icon: BookOpenIcon,
            title: $t('dashboard.no_of_courses'),
            percentage: numberOfCourses ?? 0,
            description: $t('dashboard.no_courses_description'),
            hidePercentage: true,
            href: resolve(`${$currentOrgPath}/courses`, {})
          }}
        />
        <ActivityCard
          activity={{
            icon: AwardIcon,
            title: $t('dashboard.certificates_earned'),
            percentage: totalCertificates ?? 0,
            description: $t('dashboard.certificates_earned_description'),
            hidePercentage: true,
            href: $isOrgTeamMember ? resolve(`${$currentOrgPath}/analytics`, {}) : undefined
          }}
        />
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div class="flex min-w-0 flex-col gap-4">
          <LoginActivityChart data={loginActivity} />

          <SectionCard title={$t('dashboard.top_courses')} bodyClass="px-2! pb-2!">
            {#snippet action()}
              <Button variant="ghost" size="sm" href={`${$currentOrgPath}/courses`} class="ui:text-primary">
                {$t('dashboard.view_courses')}
              </Button>
            {/snippet}
            {#if !stats}
              <div class="space-y-2 px-3 pb-3">
                {#each Array(4) as _, index (index)}
                  <Skeleton class="h-14 w-full rounded-lg" />
                {/each}
              </div>
            {:else if topCourses.length === 0}
              <Empty
                title={$t('dashboard.create_first_course')}
                description={$t('dashboard.create_first_course_description')}
                icon={BookOpenIcon}
              >
                <CreateCourseButton variant="outline" />
              </Empty>
            {:else}
              <ul class="ui:divide-border divide-y">
                {#each topCourses as course, index (course.id)}
                  <li>
                    <a
                      href={`/courses/${course.id}`}
                      class="group ui:hover:bg-muted/60 flex items-center gap-3 rounded-lg px-3 py-3 transition-colors md:gap-4"
                    >
                      <span
                        class={[
                          'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums',
                          index === 0 ? 'ui:bg-facet text-white' : 'ui:bg-accent ui:text-accent-foreground'
                        ]}
                      >
                        {index + 1}
                      </span>

                      <div class="min-w-0 flex-1">
                        <p class="line-clamp-1 text-sm leading-snug font-medium">{course.title}</p>
                        <p class="ui:text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                          <UsersIcon class="size-3" />
                          <span class="tabular-nums">{course.enrollments}</span>
                          {$t(course.enrollments === 1 ? 'dashboard.student' : 'dashboard.students')}
                        </p>
                      </div>

                      <div class="hidden w-52 shrink-0 grid-cols-2 gap-4 sm:grid">
                        <div class="space-y-1.5">
                          <div class="flex items-baseline justify-between gap-1">
                            <span class="ui:text-muted-foreground text-[11px]">{$t('dashboard.completion')}</span>
                            <span class="text-xs font-semibold tabular-nums">{course.completion}%</span>
                          </div>
                          <Progress value={course.completion} class="h-1.5" />
                        </div>
                        <div class="space-y-1.5">
                          <div class="flex items-baseline justify-between gap-1">
                            <span class="ui:text-muted-foreground text-[11px]">
                              {$t('dashboard.certification_rate')}
                            </span>
                            <span class="text-xs font-semibold tabular-nums">{course.certification}%</span>
                          </div>
                          <Progress value={course.certification} class="h-1.5" />
                        </div>
                      </div>

                      <ChevronRightIcon
                        class="ui:text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                      />
                    </a>
                  </li>
                {/each}
              </ul>
            {/if}
          </SectionCard>
        </div>

        <div class="flex min-w-0 flex-col gap-4">
          <SectionCard title={$t('dashboard.quick_actions.title')} bodyClass="px-2! pb-2!">
            <ul class="flex flex-col">
              {#each quickActions as action (action.titleKey)}
                {@const Icon = action.icon}
                <li>
                  <a
                    href={action.href}
                    class="group ui:hover:bg-muted/60 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <span
                      class="ui:bg-accent ui:text-accent-foreground grid size-9 shrink-0 place-items-center rounded-lg"
                    >
                      <Icon class="custom size-4" strokeWidth={1.9} />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-sm font-medium">{$t(action.titleKey)}</span>
                      <span class="ui:text-muted-foreground block truncate text-xs">{$t(action.descriptionKey)}</span>
                    </span>
                    <ChevronRightIcon
                      class="ui:text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                    />
                  </a>
                </li>
              {/each}
            </ul>
          </SectionCard>

          <SectionCard title={$t('dashboard.recent_certifications')}>
            {#if !stats}
              <div class="space-y-3">
                {#each Array(4) as _, index (index)}
                  <Skeleton class="h-10 w-full rounded-md" />
                {/each}
              </div>
            {:else if recentCertifications.length > 0}
              <ul class="space-y-4">
                {#each recentCertifications as certification (`${certification.id}-${certification.courseId}-${certification.date}`)}
                  <li class="flex items-start gap-3">
                    <UserAvatar
                      src={certification.avatarUrl}
                      alt={certification.name ?? $t('common.user_avatar_alt')}
                      class="size-8"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium capitalize">{certification.name}</p>
                      <a
                        class="ui:text-muted-foreground ui:hover:text-primary line-clamp-1 text-xs"
                        href={`/courses/${certification.courseId}`}
                      >
                        {certification.course}
                      </a>
                    </div>
                    <span class="ui:text-muted-foreground shrink-0 text-[11px]">{calDateDiff(certification.date)}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <Empty
                title={$t('dashboard.no_certifications_yet')}
                description={$t('dashboard.no_certifications_yet_description')}
                icon={AwardIcon}
              >
                <Button variant="outline" size="sm" onclick={() => goto(`${$currentOrgPath}/courses`)}>
                  {$t('dashboard.view_courses')}
                </Button>
              </Empty>
            {/if}
          </SectionCard>
        </div>
      </div>
    {/snippet}
  </Page.Body>
</Page.Root>
