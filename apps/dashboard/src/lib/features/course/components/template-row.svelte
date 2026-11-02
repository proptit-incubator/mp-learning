<script lang="ts">
  import { goto } from '$app/navigation';
  import { TemplateCard, DEFAULT_COURSE_BANNER_IMAGE } from '@cio/ui';
  import { ChevronsUpDownIcon } from '@cio/ui/custom/moving-icons';
  import { courseTemplateApi } from '$features/course/api';
  import { templateCardSubtitle } from '$features/course/utils/template-display';
  import { t } from '$lib/utils/functions/translations';
  import { currentOrg, currentOrgPath, isOrgTeamMember } from '$lib/utils/store/org';
  import { onDestroy } from 'svelte';

  const templates = $derived.by(() => {
    const cards = courseTemplateApi.cards;
    if (!cards) return [];

    return [...cards.org, ...cards.global].slice(0, 5);
  });

  const orgIds = $derived(new Set(courseTemplateApi.cards?.org.map((template) => template.id) ?? []));

  function galleryHref(previewId?: string) {
    const params = previewId ? `?preview=${previewId}` : '';
    return `${$currentOrgPath}/courses/templates${params}`;
  }

  let galleryIconAnimate = $state(false);
  let galleryIconTimer: ReturnType<typeof setTimeout> | undefined;
  let listedOrgId = '';

  function pulseGalleryIcon() {
    if (galleryIconAnimate) return;

    galleryIconAnimate = true;
    galleryIconTimer = setTimeout(() => {
      galleryIconAnimate = false;
    }, 200);
  }

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === listedOrgId) return;

    listedOrgId = organizationId;
    void courseTemplateApi.list();
  });

  onDestroy(() => clearTimeout(galleryIconTimer));
</script>

<section class="ui:bg-card ui:shadow-card rounded-xl border px-5 py-4">
  <div class="w-full">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-[15px] font-semibold tracking-tight">{$t('course_templates.row.heading')}</h2>
      <a
        class="ui:text-primary ui:hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
        href={galleryHref()}
        onmouseenter={pulseGalleryIcon}
      >
        {$t('course_templates.row.gallery')}
        <ChevronsUpDownIcon size={16} ariaHidden animate={galleryIconAnimate} />
      </a>
    </div>

    <div class="flex gap-3 overflow-x-auto pb-1">
      {#if $isOrgTeamMember}
        <div class="w-44 shrink-0">
          <TemplateCard
            blank
            title={$t('course_templates.row.blank')}
            subtitle={$t('course_templates.row.blank_subtitle')}
            onclick={() => goto(`${$currentOrgPath}/courses?create=true`)}
          />
        </div>
      {/if}

      {#if !courseTemplateApi.cards}
        {#each [0, 1, 2] as index (index)}
          <div class="w-44 shrink-0">
            <TemplateCard loading />
          </div>
        {/each}
      {:else}
        {#each templates as template (template.id)}
          <div class="w-44 shrink-0">
            <TemplateCard
              title={template.title}
              subtitle={templateCardSubtitle(template.lastUsedAt, orgIds.has(template.id), $t)}
              imageUrl={template.bannerImage || DEFAULT_COURSE_BANNER_IMAGE}
              imageAlt={template.title}
              onclick={() => goto(galleryHref(template.id))}
            />
          </div>
        {/each}
      {/if}
    </div>
  </div>
</section>
