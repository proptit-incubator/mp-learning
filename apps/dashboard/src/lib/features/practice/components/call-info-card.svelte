<script lang="ts">
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import TimerIcon from '@lucide/svelte/icons/timer';

  import { locale, supportedLocale, t } from '$lib/utils/functions/translations';
  import { formatCallClockTime, formatCallDate, formatCallDuration } from '$features/practice/utils/practice-utils';
  import type { PracticeCallDetail } from '$features/practice/utils/types';

  interface Props {
    call: PracticeCallDetail;
  }

  let { call }: Props = $props();

  const intlLocale = $derived(supportedLocale($locale));
  const learnerName = $derived(call.learner?.name || call.learner?.email || $t('practice.call_info.unknown_employee'));
  const startTime = $derived(formatCallClockTime(call.startedAt, intlLocale));
  const endTime = $derived(
    call.endedAt ? formatCallClockTime(call.endedAt, intlLocale) : $t('practice.call_info.not_ended')
  );
</script>

<section class="ui:bg-card rounded-2xl border p-5" data-testid="practice-call-info">
  <p class="text-sm font-semibold">{$t('practice.call_info.title')}</p>

  <div class="mt-3 flex items-center gap-3">
    <UserAvatar src={call.learner?.avatarUrl} alt={learnerName} class="size-9" />
    <div class="min-w-0">
      <p class="truncate text-sm font-medium">{learnerName}</p>
      {#if call.learner?.email && call.learner.name}
        <p class="ui:text-muted-foreground truncate text-xs">{call.learner.email}</p>
      {/if}
    </div>
  </div>

  <dl class="mt-4 grid gap-2.5 text-sm">
    <div class="flex items-center gap-2">
      <CalendarIcon class="ui:text-muted-foreground size-4 shrink-0" />
      <dt class="ui:text-muted-foreground w-24 shrink-0">{$t('practice.call_info.date')}</dt>
      <dd class="font-medium">{formatCallDate(call.startedAt, intlLocale)}</dd>
    </div>
    <div class="flex items-center gap-2">
      <ClockIcon class="ui:text-muted-foreground size-4 shrink-0" />
      <dt class="ui:text-muted-foreground w-24 shrink-0">{$t('practice.call_info.time')}</dt>
      <dd class="font-medium tabular-nums">{startTime} – {endTime}</dd>
    </div>
    <div class="flex items-center gap-2">
      <TimerIcon class="ui:text-muted-foreground size-4 shrink-0" />
      <dt class="ui:text-muted-foreground w-24 shrink-0">{$t('practice.call_info.duration')}</dt>
      <dd class="font-medium tabular-nums">
        {call.durationSeconds === null ? '—' : formatCallDuration(call.durationSeconds)}
      </dd>
    </div>
  </dl>
</section>
