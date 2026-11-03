<script lang="ts">
  import { AuthUI, SenjaEmbed } from '$features/ui';
  import { SIGNUP_FIELDS } from '$lib/utils/constants/authentication';
  import { t } from '$lib/utils/functions/translations';
  import { authValidation, getConfirmPasswordError, getDisableSubmit } from '$lib/utils/functions/validator';
  import { PASSWORD_MIN_LENGTH } from '@cio/utils/validation/auth/password';
  import { page } from '$app/state';
  import { globalStore } from '$lib/utils/store/app';
  import { currentOrg, isFreePlan } from '$lib/utils/store/org';
  import { authClient } from '$lib/utils/services/auth/client';
  import * as Field from '@cio/ui/base/field';
  import { Input } from '@cio/ui/base/input';
  import { Password } from '@cio/ui/custom/password';
  import { Button } from '@cio/ui/base/button';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  let { data } = $props();
  const emailFromUrl = page.url.searchParams.get('email') ?? '';
  const isEmailPrefilled = !!emailFromUrl;
  let fields = $state(Object.assign({}, SIGNUP_FIELDS, emailFromUrl ? { email: emailFromUrl } : {}));
  let loading = $state(false);
  let errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  } = $state({});
  let submitError: string = $state('');

  const disableSubmit = $derived(getDisableSubmit(fields));
  const redirectUrl = $derived(page.url.searchParams.get('redirect'));
  const inviteToken = $derived(page.url.searchParams.get('invite_token'));

  // Use org from store or layout data (layout data ensures org is available on self-hosted before store is set)
  const org = $derived($currentOrg?.id ? $currentOrg : (data.org ?? $currentOrg));

  // Invite context: allow signup when invite_token present or redirect contains invite info
  const hasInviteContext = $derived(
    !!inviteToken || (!!redirectUrl && (redirectUrl.includes('/invite/') || redirectUrl.includes('invite_token')))
  );
  const inviteOnly = $derived(!!org?.settings?.signup?.inviteOnly);
  const signupRestricted = $derived($globalStore.isOrgSite && (org.disableSignup || (inviteOnly && !hasInviteContext)));

  // Hide Google Auth if disabled for org
  const hideGoogleAuth = $derived(!!($globalStore.isOrgSite && org.disableGoogleAuth));

  // Check if signup is disabled
  onMount(() => {
    if ($globalStore.isOrgSite && org.disableSignup) {
      goto(resolve('/login?error=signup_disabled', {}));
    }
  });

  function handleEmailChange() {
    errors.email = '';
  }

  async function handleSubmit() {
    if (signupRestricted) {
      submitError = t.get('settings.auth.login.signup_disabled_error');
      return;
    }

    const validationRes = authValidation(fields);
    console.log('validationRes', validationRes);

    if (Object.keys(validationRes).length) {
      errors = Object.assign(errors, validationRes);
      return;
    }

    try {
      loading = true;
      const name = fields.email.split('@')[0];

      // if in selfhosted instance always pass org id
      // if in cloud instance, ONLY pass when on subdomain i.e student experience
      const headers = $globalStore.isOrgSite ? { 'cio-org-id': org.id } : undefined;

      const { error } = await authClient.signUp.email(
        {
          email: fields.email,
          password: fields.password,
          name: name
        },
        {
          headers
        }
      );

      if (error) {
        throw error;
      }

      const redirect = redirectUrl || '/';
      window.location.href = redirect.startsWith('/') ? redirect : `/?redirect=${encodeURIComponent(redirect)}`;
    } catch (error) {
      submitError =
        (error as { error_description?: string; message?: string })?.error_description ||
        (error as { message?: string })?.message ||
        '';
      loading = false;
    }
  }

  let passwordHasBlurred = $state(false);

  function handlePasswordBlur() {
    passwordHasBlurred = true;
    validatePasswordLength();
  }

  function handlePasswordInput() {
    if (passwordHasBlurred) {
      validatePasswordLength();
    }
  }

  function validatePasswordLength() {
    if (fields.password && fields.password.length < PASSWORD_MIN_LENGTH) {
      errors.password = 'validations.auth.password.min_char';
    } else {
      errors.password = '';
    }
  }

  const confirmPasswordError = $derived(getConfirmPasswordError(fields));
</script>

<svelte:head>
  <title>{$t('page_titles.join_platform')}</title>
</svelte:head>

{#if !$globalStore.isOrgSite || $isFreePlan}
  <SenjaEmbed id="aa054658-1e15-4d00-8920-91f424326c4e" />
{/if}

{#if signupRestricted}
  <div
    class="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-900/20"
  >
    <h2 class="text-lg font-semibold text-amber-800 dark:text-amber-200">
      {$t('login.signup_disabled.title')}
    </h2>
    <p class="mt-2 text-sm text-amber-700 dark:text-amber-300">
      {org.disableSignupMessage ||
        (inviteOnly
          ? $t('login.signup_disabled.invite_only_message')
          : $t('settings.auth.login.signup_disabled_error'))}
    </p>
    <Button variant="outline" class="mt-4" onclick={() => goto(resolve('/login', {}))}>
      {$t('login.signup_disabled.go_to_login')}
    </Button>
  </div>
{:else}
  <AuthUI isLogin={false} {handleSubmit} isLoading={loading} {hideGoogleAuth}>
    <div class="flex flex-col gap-6">
      <Field.Field>
        <Field.Label for="email">{$t('login.fields.email')}</Field.Label>
        <Field.Content>
          <Input
            id="email"
            type="email"
            bind:value={fields.email}
            oninput={handleEmailChange}
            placeholder="you@domain.com"
            disabled={loading || isEmailPrefilled}
            readonly={isEmailPrefilled}
            autofocus
            aria-invalid={errors.email ? 'true' : undefined}
            autocomplete="email"
          />
          {#if errors.email}
            <Field.Error>{$t(errors.email)}</Field.Error>
          {/if}
        </Field.Content>
      </Field.Field>

      <Field.Field>
        <Field.Label for="password">{$t('login.fields.password')}</Field.Label>
        <Field.Content>
          <Password
            id="password"
            bind:value={fields.password}
            placeholder="************"
            showPasswordTooltip={$t('auth.password.show')}
            hidePasswordTooltip={$t('auth.password.hide')}
            showPasswordAriaLabel={$t('auth.password.show')}
            hidePasswordAriaLabel={$t('auth.password.hide')}
            disabled={loading}
            onblur={handlePasswordBlur}
            oninput={handlePasswordInput}
            aria-invalid={errors.password ? 'true' : undefined}
            autocomplete="new-password"
          />
          {#if errors.password}
            <Field.Error>{$t(errors.password)}</Field.Error>
          {:else}
            <Field.Description>{$t('login.fields.password_helper_message')}</Field.Description>
          {/if}
        </Field.Content>
      </Field.Field>

      <Field.Field>
        <Field.Label for="confirmPassword">{$t('login.fields.confirm_password')}</Field.Label>
        <Field.Content>
          <Password
            id="confirmPassword"
            bind:value={fields.confirmPassword}
            placeholder="************"
            showPasswordTooltip={$t('auth.password.show')}
            hidePasswordTooltip={$t('auth.password.hide')}
            showPasswordAriaLabel={$t('auth.password.show')}
            hidePasswordAriaLabel={$t('auth.password.hide')}
            disabled={loading}
            aria-invalid={confirmPasswordError ? 'true' : undefined}
            autocomplete="new-password"
          />
          {#if confirmPasswordError}
            <Field.Error>{confirmPasswordError}</Field.Error>
          {/if}
        </Field.Content>
      </Field.Field>

      {#if submitError}
        <p class="ui:text-destructive text-sm">{submitError}</p>
      {/if}

      <Button type="submit" disabled={disableSubmit || loading} {loading} class="w-full">
        {$t('login.create_account')}
      </Button>
    </div>
  </AuthUI>
{/if}
