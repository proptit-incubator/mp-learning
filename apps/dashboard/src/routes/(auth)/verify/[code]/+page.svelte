<script lang="ts">
  import { page } from '$app/state';
  import { CertificateVerifyApi } from '$features/certificate-verify/api/certificate-verify.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { Badge } from '@cio/ui/base/badge';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';

  const api = new CertificateVerifyApi();
  const code = $derived(page.params.code ?? '');
  const certificate = $derived(api.certificate);
  const stateVariant = $derived(
    certificate?.state === 'valid' ? 'success' : certificate?.state === 'expired' ? 'warning' : 'destructive'
  );

  let loadedCode = '';
  $effect(() => {
    if (!code || code === loadedCode) return;

    loadedCode = code;
    void api.load(code);
  });

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(
      new Date(value)
    );
  }
</script>

<svelte:head>
  <title>{$t('certificate_verify.title')} · MP Learning</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="ui:bg-background flex min-h-screen items-center justify-center p-6">
  <section class="ui:bg-card ui:border-border w-full max-w-lg overflow-hidden rounded-2xl border shadow-sm">
    <div class="h-2 bg-gradient-to-r from-[#0e2259] via-[#1559c6] to-[#6cc9f2]"></div>
    <div class="space-y-6 p-8">
      <header class="space-y-3">
        <img src="/brand/mp-transformation.png" alt="MP Transformation" class="h-9 w-auto" />
        <div>
          <h1 class="text-xl font-semibold">{$t('certificate_verify.title')}</h1>
          <p class="ui:text-muted-foreground text-sm">{$t('certificate_verify.subtitle')}</p>
        </div>
      </header>

      {#if api.loading}
        <div class="space-y-3" aria-busy="true" aria-label={$t('certificate_verify.loading')}>
          <Skeleton class="h-6 w-32" />
          <Skeleton class="h-8 w-3/4" />
          <Skeleton class="h-20 w-full" />
        </div>
      {:else if api.notFound || !certificate}
        <div class="ui:bg-danger-soft ui:text-danger-foreground flex items-start gap-3 rounded-xl p-4" role="alert">
          <ShieldAlertIcon class="custom mt-0.5 size-5 shrink-0" />
          <div>
            <p class="font-medium">{$t('certificate_verify.not_found_title')}</p>
            <p class="text-sm">{$t('certificate_verify.not_found_description', { code })}</p>
          </div>
        </div>
      {:else}
        <div class="space-y-5" data-testid="certificate-verify-result" data-state={certificate.state}>
          <div class="flex items-center gap-2">
            <ShieldCheckIcon class="custom size-5 text-[#1559c6]" />
            <Badge variant={stateVariant}>{$t(`certificate_verify.state.${certificate.state}`)}</Badge>
          </div>
          <div>
            <p class="ui:text-muted-foreground text-xs">{$t('certificate_verify.recipient')}</p>
            <p class="text-2xl font-bold text-[#0e2259]">{certificate.recipientName}</p>
            {#if certificate.employeeCode}
              <p class="ui:text-muted-foreground text-sm">
                {$t('certificate_verify.employee_code')}: {certificate.employeeCode}
              </p>
            {/if}
          </div>
          <dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div class="sm:col-span-2">
              <dt class="ui:text-muted-foreground text-xs">{$t('certificate_verify.course')}</dt>
              <dd class="font-medium">{certificate.courseTitle}</dd>
            </div>
            <div>
              <dt class="ui:text-muted-foreground text-xs">{$t('certificate_verify.issued')}</dt>
              <dd class="font-medium">{formatDate(certificate.issuedAt)}</dd>
            </div>
            <div>
              <dt class="ui:text-muted-foreground text-xs">{$t('certificate_verify.valid_until')}</dt>
              <dd class="font-medium">
                {certificate.expiresAt ? formatDate(certificate.expiresAt) : $t('certificate_verify.no_expiry')}
              </dd>
            </div>
            <div>
              <dt class="ui:text-muted-foreground text-xs">{$t('certificate_verify.organization')}</dt>
              <dd class="font-medium">{certificate.organizationName}</dd>
            </div>
            <div>
              <dt class="ui:text-muted-foreground text-xs">{$t('certificate_verify.code')}</dt>
              <dd class="font-mono font-medium tracking-wider">{certificate.code}</dd>
            </div>
          </dl>
        </div>
      {/if}
    </div>
  </section>
</main>
