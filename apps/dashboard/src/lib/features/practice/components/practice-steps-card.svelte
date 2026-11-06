<script lang="ts">
  import HeadsetIcon from '@lucide/svelte/icons/headset';

  import { t } from '$lib/utils/functions/translations';

  const STEP_KEYS = ['practice.steps.choose', 'practice.steps.start', 'practice.steps.talk', 'practice.steps.finish'];
</script>

<section class="rounded-2xl bg-slate-900 p-5 text-slate-50 dark:bg-slate-800">
  <header class="flex items-center gap-3">
    <span class="flex size-10 items-center justify-center rounded-full bg-white/10">
      <HeadsetIcon class="size-5" />
    </span>
    <div>
      <p class="text-sm font-semibold">{$t('practice.steps.title')}</p>
      <p class="text-xs text-slate-400">{$t('practice.steps.subtitle')}</p>
    </div>
  </header>
  <ol class="mt-4 space-y-3">
    {#each STEP_KEYS as stepKey, index (stepKey)}
      <li class="flex items-center gap-3 text-sm">
        <span
          class="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-semibold text-blue-300"
        >
          {index + 1}
        </span>
        <span>{$t(stepKey)}</span>
      </li>
    {/each}
  </ol>
</section>
