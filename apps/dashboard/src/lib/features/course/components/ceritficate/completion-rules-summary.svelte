<script lang="ts">
  import * as Field from '@cio/ui/base/field';
  import { Button } from '@cio/ui/base/button';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import { courseApi } from '$features/course/api';
  import { getCompletionRulesSummary } from '$features/course/utils/completion-rules-utils';
  import { getHighlightHref } from '$lib/routing/go-and-highlight';
  import { NAVIGATION_SOURCE, NAVIGATION_SOURCE_PARAM, ROUTE_NAME, ROUTE_SECTIONS } from '$lib/routing/routes';
  import { t } from '$lib/utils/functions/translations';
  import { isFreePlan } from '$lib/utils/store/org';

  const summary = $derived(getCompletionRulesSummary(courseApi.course));
  const courseId = $derived(courseApi.course?.id);
  const progressionLabel = $derived(
    summary.progressionMode === 'sequential'
      ? $t('course.navItem.settings.progression_mode_sequential')
      : $t('course.navItem.settings.progression_mode_free')
  );
  const editRulesHref = $derived(courseId ? getEditRulesHref(courseId) : undefined);
  const isEditRulesLocked = $derived($isFreePlan);

  function getEditRulesHref(id: string) {
    return getHighlightHref(ROUTE_NAME.COURSE_SETTINGS, ROUTE_SECTIONS[ROUTE_NAME.COURSE_SETTINGS].COMPLETION_RULES, {
      id,
      [NAVIGATION_SOURCE_PARAM]: NAVIGATION_SOURCE.CERTIFICATE_SETTINGS
    });
  }
</script>

<Field.Set>
  <Field.Legend>{$t('course.certification.completion_rules_heading')}</Field.Legend>
  <Field.Description>{$t('course.certification.completion_rules_description')}</Field.Description>

  <ul
    class="ui:text-muted-foreground list-disc space-y-1 pl-5 text-sm"
    data-testid="certificate-completion-rules-summary"
  >
    <li>
      {$t('course.navItem.settings.progression_mode_title')}:
      <strong>{progressionLabel}</strong>
    </li>
  </ul>

  {#if editRulesHref}
    <div class="w-fit" class:cursor-not-allowed={isEditRulesLocked}>
      <Button
        variant="outline"
        href={isEditRulesLocked ? undefined : editRulesHref}
        disabled={isEditRulesLocked}
        data-sveltekit-noscroll
        testId="certificate-settings-completion-rules-link"
      >
        {$t('course.certification.completion_rules_edit')}
        <ArrowUpRightIcon />
      </Button>
    </div>
  {/if}
</Field.Set>
