<script lang="ts">
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { Badge } from '@cio/ui/base/badge';
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import { CourseCard } from '@cio/ui';
  import UserIcon from '@lucide/svelte/icons/user';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';

  import { Progress } from '@cio/ui/base/progress';

  import { pluralizeLabel } from '$lib/utils/functions/pluralize-label';

  import { Image } from '$features/ui';
  import { t } from '$lib/utils/functions/translations';
  import { calcCourseProgress, calcProgressRate } from '$features/course/utils/functions';
  import { isSelfEnrollmentAllowed } from '@cio/utils/functions';
  import EnrollmentStateBadge from '$features/enrollment/components/enrollment-state-badge.svelte';
  import CardDropdown from './card-dropdown.svelte';
  import CourseCover from './course-cover.svelte';
  import CoursePublishBadge from './course-publish-badge.svelte';
  import CourseTagsOverflow from './course-tags-overflow.svelte';
  import type { OrgCourses, UserEnrolledCourses } from '$features/course/types';

  export interface Props {
    course: OrgCourses[number] | UserEnrolledCourses[number];
    isOnLandingPage?: boolean;
    isLMS?: boolean;
    isExplore?: boolean;
    isCertificateView?: boolean;
    href?: string;
    actions?: Snippet;
    onExploreClick?: () => void;
  }

  let { course, isOnLandingPage, isLMS, isExplore, isCertificateView, href, actions, onExploreClick }: Props = $props();

  let {
    bannerImage,
    id = '',
    slug = '',
    title = '',
    description = '',
    isPublished = false,
    totalLessons = 0,
    totalExercises = 0,
    totalStudents = 0,
    progressRate = 45
  } = $derived({
    id: course.id,
    slug: course.slug ?? '',
    bannerImage: course.bannerImage || '',
    title: course.title,
    description: course.description,
    isPublished: !!course.isPublished,
    totalLessons: course.lessonCount,
    totalExercises: (() => {
      const c = course as { exerciseCount?: number };
      return typeof c.exerciseCount === 'number' ? c.exerciseCount : 0;
    })(),
    progressRate: (() => {
      const c = course as { exerciseCount?: number; exercisesCompleted?: number };
      if (typeof c.exerciseCount === 'number' && typeof c.exercisesCompleted === 'number') {
        return calcCourseProgress({
          lessonsCompleted: 'progressRate' in course ? (course.progressRate ?? 0) : 0,
          totalLessons: course.lessonCount ?? 0,
          exercisesCompleted: c.exercisesCompleted,
          totalExercises: c.exerciseCount
        });
      }
      return calcProgressRate('progressRate' in course ? course.progressRate : 0, course.lessonCount);
    })(),
    totalStudents: 'totalStudents' in course ? course.totalStudents : 0
  });

  const courseTags = $derived(
    ('tags' in course && Array.isArray(course.tags) ? course.tags : []) as Array<{
      id: string;
      name: string;
      slug: string;
      color?: string | null;
    }>
  );

  const isExploreClickable = $derived(!!(isLMS && isExplore && onExploreClick));

  let courseUrl = $derived.by(() => {
    if (isExploreClickable) {
      return undefined;
    }

    if (href) {
      return href;
    }

    if (isCertificateView) {
      return `/courses/${id}/certificates`;
    }

    if (isOnLandingPage || isExplore) {
      if (!slug) {
        return undefined;
      }

      return `/course/${slug}`;
    }

    return `/courses/${id}${isLMS ? '/lessons?next=true' : ''}`;
  });

  const typeBadge = $derived(
    !isLMS && !isOnLandingPage && isSelfEnrollmentAllowed(course.metadata)
      ? { label: $t('training_library.self_enrollment'), icon: UserIcon, iconClass: 'custom ui:text-primary' }
      : undefined
  );
  const enrollment = $derived('enrollment' in course ? course.enrollment : null);
  const certificateEarnedAt = $derived(
    isCertificateView && 'certificateEarnedAt' in course ? course.certificateEarnedAt : null
  );

  function formatDate(value: string | null | undefined) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(getIntlLocale(), {
      dateStyle: 'medium'
    }).format(date);
  }
</script>

<CourseCard
  href={courseUrl ? resolve(courseUrl, {}) : undefined}
  onclick={isExploreClickable ? onExploreClick : undefined}
  {title}
  {description}
  {typeBadge}
  class="group relative"
>
  {#snippet media()}
    {#if bannerImage}
      <Image src={bannerImage} alt={$t('course.card.banner_alt')} className="w-full h-full object-cover" />
    {:else}
      <CourseCover {title} class="size-full" />
    {/if}
  {/snippet}

  {#snippet overlay()}
    {#if actions}
      {@render actions()}
    {:else if !isOnLandingPage}
      {#if !isLMS}
        <CardDropdown {id} {title} {description} {isPublished} {slug} studentCount={totalStudents} />
      {/if}
    {/if}
  {/snippet}

  {#snippet tags()}
    {#if !isLMS}
      <CourseTagsOverflow tags={courseTags} variant="card" />
    {/if}
  {/snippet}

  {#snippet footer()}
    {@const lessonSummary = `${totalLessons} ${$t('courses.course_card.lessons_number')} · ${pluralizeLabel($t('courses.course_card.exercise'), totalExercises)}`}
    <div class="flex w-full flex-col gap-3">
      {#if isLMS && !isExplore && !isCertificateView}
        {#if enrollment}
          <div class="flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant={enrollment.kind === 'ASSIGNED' ? 'default' : 'outline'}
              >{$t(`enrollment.kind.${enrollment.kind}`)}</Badge
            >
            <EnrollmentStateBadge state={enrollment.state} />
            {#if enrollment.kind === 'ASSIGNED' && enrollment.dueDate}
              <span class="ui:text-muted-foreground">{$t('enrollment.due')}: {formatDate(enrollment.dueDate)}</span>
            {/if}
            {#if enrollment.validUntil}
              <span class="ui:text-muted-foreground"
                >{$t('enrollment.valid_until')}: {formatDate(enrollment.validUntil)}</span
              >
            {/if}
          </div>
        {/if}
        <div class="flex items-center gap-3">
          <Progress value={progressRate} class="h-1.5 flex-1" />
          <span class="ui:text-foreground w-9 text-right text-xs font-semibold tabular-nums">{progressRate}%</span>
        </div>
      {/if}

      <div class="flex items-center justify-between gap-3 text-xs">
        {#if isOnLandingPage}
          <span class="ui:text-muted-foreground">{lessonSummary}</span>
        {:else if isLMS}
          {#if isCertificateView}
            <span class="ui:text-muted-foreground">
              {#if certificateEarnedAt}{$t('certificates.earned_on')}: {formatDate(certificateEarnedAt)}{/if}
            </span>
          {:else}
            <span class="ui:text-muted-foreground truncate">{lessonSummary}</span>
          {/if}
          <span class="ui:text-primary inline-flex shrink-0 items-center gap-1 font-semibold">
            {isCertificateView
              ? $t('certificates.view_certificate')
              : isExplore
                ? $t('courses.course_card.learn_more')
                : $t('courses.course_card.continue_course')}
            <ArrowRightIcon class="custom size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        {:else}
          <CoursePublishBadge {isPublished} />
          <span class="ui:text-muted-foreground truncate text-right">
            {lessonSummary} · {pluralizeLabel($t('courses.course_card.students'), totalStudents)}
          </span>
        {/if}
      </div>
    </div>
  {/snippet}
</CourseCard>
