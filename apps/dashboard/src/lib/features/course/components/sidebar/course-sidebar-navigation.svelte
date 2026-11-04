<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Plus from '@lucide/svelte/icons/plus';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { BackButton } from '@cio/ui';

  import TableOfContentsIcon from '@lucide/svelte/icons/table-of-contents';
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
  import CalendarCheckIcon from '@lucide/svelte/icons/calendar-check';
  import BotIcon from '@lucide/svelte/icons/bot';
  import AwardIcon from '@lucide/svelte/icons/award';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import ClipboardCheckIcon from '@lucide/svelte/icons/clipboard-check';
  import MegaphoneIcon from '@lucide/svelte/icons/megaphone';
  import UsersRoundIcon from '@lucide/svelte/icons/users-round';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import InboxIcon from '@lucide/svelte/icons/inbox';
  import { ContentType } from '@cio/utils/constants/content';
  import { contentCreateStoreUtils, contentEditingStore } from '$features/course/components/content/store';
  import { openAddContentModal } from '$features/course/components/content/open-content-create';
  import { getCourseContent } from '$features/course/utils/content';
  import CourseContentTree from './course-content-tree.svelte';
  import ContentCountBadges from '../content-count-badges.svelte';

  import { NAV_IDS } from './constants';
  import { courseApi } from '$features/course/api';
  import { courseHasLiveSession } from '$features/course/utils/live-session';
  import { t } from '$lib/utils/functions/translations';
  import { aiEnabled } from '$lib/utils/store/ai';
  import { currentOrg, currentOrgPath } from '$lib/utils/store/org';
  import { isStudentExperience } from '$lib/utils/store/app';
  import { getNavItemRoute, getLessonsRoute } from '$features/course/utils/functions';
  import { useSidebar } from '@cio/ui/base/sidebar';
  import { IconButton } from '@cio/ui/custom/icon-button';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { profile } from '$lib/utils/store/user';

  interface Props {
    path: string;
    id: string;
    isStudent?: boolean;
  }

  let { path, id, isStudent = false }: Props = $props();

  const coursesListPath = $derived($isStudentExperience ? '/lms/mylearning' : `${$currentOrgPath}/courses`);

  const currentPath = $derived(path || page.url.pathname);
  const lessonsRoute = $derived(getLessonsRoute(id));
  const isOnContentRoute = $derived(
    currentPath.includes('/lessons') || currentPath.includes('/exercises') || currentPath === lessonsRoute
  );

  let contentTreeCollapsed = $state(false);
  let trackedContentKey = $state('');

  const contentData = $derived(getCourseContent(courseApi.course));
  const sidebar = useSidebar();
  const contentCount = $derived.by(() => {
    const contentItems = contentData.grouped
      ? contentData.sections.flatMap((section) => section.items)
      : contentData.items;
    const lessons = contentItems.filter((item) => item.type === ContentType.Lesson).length;
    const exercises = contentItems.filter((item) => item.type === ContentType.Exercise).length;

    return {
      lessons,
      exercises,
      total: lessons + exercises
    };
  });
  const showContentCount = $derived(sidebar.open && !sidebar.isMobile && contentCount.total > 0);
  const isContentTreeExpanded = $derived(!contentTreeCollapsed);
  const hasLiveSession = $derived(courseHasLiveSession(courseApi.course));

  const navItems = $derived(
    [
      {
        id: NAV_IDS.NEWS_FEED,
        title: $t('course.navItems.nav_news_feed'),
        url: getNavItemRoute(id),
        isActive: currentPath === getNavItemRoute(id),
        show() {
          return isStudent ? $currentOrg.customization?.['course']?.['newsfeed'] : true;
        },
        icon: getNavIcon(NAV_IDS.NEWS_FEED)
      },
      {
        id: NAV_IDS.LESSONS,
        title: $t('course.navItems.nav_content'),
        url: lessonsRoute,
        isActive: isOnContentRoute,
        isLesson: true,
        icon: getNavIcon(NAV_IDS.LESSONS)
      },
      {
        id: NAV_IDS.CERTIFICATES,
        title: $t('course.navItems.nav_certificates'),
        url: getNavItemRoute(id, 'certificates'),
        isActive: currentPath === getNavItemRoute(id, 'certificates'),
        icon: getNavIcon(NAV_IDS.CERTIFICATES)
      },
      {
        id: NAV_IDS.ANALYTICS,
        title: $t('course.navItems.nav_analytics'),
        url: getNavItemRoute(id, 'analytics'),
        isActive: currentPath === getNavItemRoute(id, 'analytics'),
        show() {
          if (courseApi.course?.isTemplate) return false;
          return !isStudent;
        },
        icon: getNavIcon(NAV_IDS.ANALYTICS)
      },
      {
        id: NAV_IDS.ATTENDANCE,
        title: $t('course.navItems.nav_attendance'),
        url: getNavItemRoute(id, 'attendance'),
        isActive: currentPath === getNavItemRoute(id, 'attendance'),
        show() {
          return hasLiveSession;
        },
        icon: getNavIcon(NAV_IDS.ATTENDANCE)
      },
      {
        id: NAV_IDS.SUBMISSIONS,
        title: $t('course.navItems.nav_submissions'),
        url: getNavItemRoute(id, 'submissions'),
        isActive: currentPath === getNavItemRoute(id, 'submissions'),
        show() {
          if (courseApi.course?.isTemplate) return false;
          if (isStudent) return false;

          return courseApi.course?.canGrade === true;
        },
        icon: getNavIcon(NAV_IDS.SUBMISSIONS)
      },
      {
        id: NAV_IDS.MARKS,
        title: $t('course.navItems.nav_marks'),
        url: getNavItemRoute(id, 'marks'),
        isActive: currentPath === getNavItemRoute(id, 'marks'),
        show() {
          if (courseApi.course?.isTemplate) return false;
          return isStudent ? ($currentOrg.customization?.['course']?.['grading'] ?? false) : true;
        },
        icon: getNavIcon(NAV_IDS.MARKS)
      },
      {
        id: NAV_IDS.PEOPLE,
        title: $t('course.navItems.nav_people'),
        url: getNavItemRoute(id, 'people'),
        isActive: currentPath === getNavItemRoute(id, 'people'),
        show() {
          if (courseApi.course?.isTemplate) return false;
          return !isStudent;
        },
        icon: getNavIcon(NAV_IDS.PEOPLE)
      },
      {
        id: NAV_IDS.AI_ASSISTANT,
        title: $t('course.navItems.nav_ai_tutor'),
        url: getNavItemRoute(id, 'ai-tutor'),
        isActive: currentPath === getNavItemRoute(id, 'ai-tutor'),
        show() {
          return !isStudent && $aiEnabled === true;
        },
        icon: getNavIcon(NAV_IDS.AI_ASSISTANT)
      },
      {
        id: NAV_IDS.SETTINGS,
        title: $t('course.navItems.nav_settings'),
        url: getNavItemRoute(id, 'settings'),
        isActive: currentPath === getNavItemRoute(id, 'settings'),
        show() {
          return !isStudent;
        },
        icon: getNavIcon(NAV_IDS.SETTINGS)
      }
    ].filter((item) => !item.show || item.show())
  );

  $effect(() => {
    const contentKey = `${id}${currentPath}`;

    if (contentKey === trackedContentKey) {
      return;
    }

    trackedContentKey = contentKey;
    contentTreeCollapsed = false;
  });

  function handleContentNavClick() {
    contentTreeCollapsed = false;
  }

  function handleContentTreeToggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    contentTreeCollapsed = !contentTreeCollapsed;
  }

  function openSectionEditor(courseId: string, sectionId: string) {
    goto(resolve(`/courses/${courseId}/lessons`, {}));
    contentCreateStoreUtils.close();
    contentEditingStore.set(sectionId);
  }

  function getNavIcon(navigationId: string) {
    const icons = {
      [NAV_IDS.SECTION]: TableOfContentsIcon,
      [NAV_IDS.NEWS_FEED]: MegaphoneIcon,
      [NAV_IDS.LESSONS]: BookOpenIcon,
      [NAV_IDS.ATTENDANCE]: CalendarCheckIcon,
      [NAV_IDS.SUBMISSIONS]: InboxIcon,
      [NAV_IDS.MARKS]: ClipboardCheckIcon,
      [NAV_IDS.PEOPLE]: UsersRoundIcon,
      [NAV_IDS.ANALYTICS]: ChartColumnIcon,
      [NAV_IDS.CERTIFICATES]: AwardIcon,
      [NAV_IDS.SETTINGS]: SettingsIcon,
      [NAV_IDS.AI_ASSISTANT]: BotIcon
    };
    return icons[navigationId] ?? BookOpenIcon;
  }

  const navGroups = $derived(
    [
      {
        title: 'mp_workspace.course_content',
        items: navItems.filter((item) => [NAV_IDS.NEWS_FEED, NAV_IDS.LESSONS].includes(item.id))
      },
      {
        title: 'mp_workspace.course_learning',
        items: navItems.filter((item) =>
          [
            NAV_IDS.PEOPLE,
            NAV_IDS.ATTENDANCE,
            NAV_IDS.SUBMISSIONS,
            NAV_IDS.MARKS,
            NAV_IDS.CERTIFICATES,
            NAV_IDS.ANALYTICS
          ].includes(item.id)
        )
      },
      {
        title: 'mp_workspace.course_settings',
        items: navItems.filter((item) => [NAV_IDS.AI_ASSISTANT, NAV_IDS.SETTINGS].includes(item.id))
      }
    ].filter((group) => group.items.length)
  );
</script>

<Sidebar.Group class="pt-0!">
  <BackButton href={resolve(coursesListPath, {})} label={$t('org_navigation.exit_course')} class="px-2! py-2!" />

  {#each navGroups as group (group.title)}
    <Sidebar.GroupLabel>{$t(group.title)}</Sidebar.GroupLabel>
    <Sidebar.Menu class="mb-3">
      {#each group.items as item (item.id)}
        <Sidebar.MenuItem>
          <div class="relative flex items-center">
            <Sidebar.MenuButton
              tooltipContent={item.title}
              isActive={item.isActive}
              class={item.isLesson ? 'pr-16' : ''}
            >
              {#snippet child({ props })}
                {@const Icon = item.icon}
                <a
                  href={resolve(item.url, {})}
                  {...props}
                  data-testid={item.isLesson ? 'course-content-nav' : undefined}
                  onclick={item.isLesson ? handleContentNavClick : undefined}
                >
                  <Icon size={17} strokeWidth={1.75} class="custom" />
                  <span>{item.title}</span>
                  {#if item.isLesson && showContentCount}<ContentCountBadges
                      lessons={contentCount.lessons}
                      exercises={contentCount.exercises}
                    />{/if}
                </a>
              {/snippet}
            </Sidebar.MenuButton>
            {#if item.isLesson && (sidebar.open || sidebar.isMobile)}
              <div class="absolute right-1 flex items-center gap-1">
                {#if !isStudent}
                  <IconButton
                    variant="secondary"
                    size="icon-2xs"
                    aria-label={$t('course.navItem.lessons.add_content')}
                    tooltip={$t('course.navItem.lessons.add_content')}
                    shortcut={['Ctrl', '⇧', 'N']}
                    onclick={() => openAddContentModal(id)}><Plus class="size-3.5" /></IconButton
                  >
                {/if}
                <IconButton
                  variant="secondary"
                  size="icon-2xs"
                  aria-expanded={isContentTreeExpanded}
                  aria-label={$t(
                    isContentTreeExpanded
                      ? 'course.navItem.lessons.collapse_content'
                      : 'course.navItem.lessons.expand_content'
                  )}
                  testId="course-content-nav-toggle"
                  onclick={handleContentTreeToggle}
                  ><ChevronRightIcon class={isContentTreeExpanded ? 'size-3.5 rotate-90' : 'size-3.5'} /></IconButton
                >
              </div>
            {/if}
          </div>
          {#if item.isLesson && isContentTreeExpanded}
            <div class="max-h-[48svh] overflow-y-auto overscroll-contain">
              <CourseContentTree
                {path}
                {id}
                {isStudent}
                className="mt-1 ml-2"
                onOpenContentModal={isStudent ? undefined : (sectionId) => openAddContentModal(id, sectionId)}
                onEditSection={isStudent ? undefined : (sectionId) => openSectionEditor(id, sectionId)}
              />
            </div>
          {/if}
        </Sidebar.MenuItem>
      {/each}
    </Sidebar.Menu>
  {/each}
</Sidebar.Group>
