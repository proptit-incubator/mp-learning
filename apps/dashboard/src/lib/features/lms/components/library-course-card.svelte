<script lang="ts">
  import { Badge } from '@cio/ui/base/badge';
  import CourseCover from '$features/course/components/course-cover.svelte';
  import { t } from '$lib/utils/functions/translations';
  import type { LibraryCourse } from '../utils/types';

  let { course }: { course: LibraryCourse } = $props();
</script>

<a
  href={`/lms/explore/${course.id}`}
  class="ui:bg-card ui:shadow-card ui:hover:border-primary/40 flex h-full flex-col overflow-hidden rounded-xl border transition-colors"
>
  <CourseCover title={course.title} src={course.bannerImage} class="aspect-[16/7] w-full" />
  <div class="flex flex-1 flex-col gap-3 p-4">
    <h2 class="line-clamp-2 text-base font-semibold">{course.title}</h2>
    <p class="ui:text-muted-foreground line-clamp-2 text-sm">{course.description}</p>
    <p class="ui:text-muted-foreground mt-auto text-xs">{$t('lms_home.lesson_count', { count: course.lessonCount })}</p>
    <div>
      <Badge variant="secondary"
        >{$t(
          course.isEnrolled
            ? 'training_library.enrolled'
            : course.hasAccess
              ? 'training_library.available_to_you'
              : 'training_library.self_enrollment'
        )}</Badge
      >
    </div>
  </div>
</a>
