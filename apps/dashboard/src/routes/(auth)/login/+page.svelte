<script lang="ts">
  import { signInErrorMessage } from '$features/auth/utils/sign-in-error';
  import { safeRedirectPath } from '@cio/utils/functions/links';
  import { AuthUI } from '$features/ui';
  import { LOGIN_FIELDS } from '$lib/utils/constants/authentication';
  import { t } from '$lib/utils/functions/translations';
  import { authValidation } from '$lib/utils/functions/validator';
  import { currentOrg } from '$lib/utils/store/org';
  import { authClient } from '$lib/utils/services/auth/client';
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { globalStore } from '$lib/utils/store/app';
  import * as Field from '@cio/ui/base/field';
  import { Input } from '@cio/ui/base/input';
  import { Password } from '@cio/ui/custom/password';
  import { Button } from '@cio/ui/base/button';

  const emailFromUrl = page.url.searchParams.get('email') ?? '';
  const isEmailPrefilled = !!emailFromUrl;

  let fields = $state(Object.assign({}, LOGIN_FIELDS, emailFromUrl ? { email: emailFromUrl } : {}));

  let submitError: string | undefined = $state();
  let loading = $state(false);
  let errors = $state(Object.assign({}, LOGIN_FIELDS));

  const redirectUrl = $derived(page.url.searchParams.get('redirect'));

  const hideGoogleAuth = $derived(!!($globalStore.isOrgSite && $currentOrg.disableGoogleAuth));

  function handleEmailChange() {
    errors.email = '';
  }

  async function handleSubmit() {
    if ($globalStore.isOrgSite && $currentOrg.disableEmailPassword) {
      submitError = t.get('settings.auth.login.email_password_disabled');
      return;
    }

    const validationRes = authValidation(fields, { skipPassword: true, allowEmployeeCode: true });
    console.log('validationRes', validationRes);

    if (Object.keys(validationRes).length) {
      errors = Object.assign(errors, validationRes);
      return;
    }

    try {
      loading = true;

      const { data, error } = await authClient.signIn.email(
        {
          email: fields.email,
          password: fields.password
        },
        {
          onSuccess: () => {
            window.location.href = safeRedirectPath(redirectUrl);
          }
        }
      );

      console.log('data', data);

      if (error) throw error;
    } catch (error) {
      const message = signInErrorMessage(error as Parameters<typeof signInErrorMessage>[0]);
      submitError = $t(message.key, message.params);
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{$t('login.login')} · MP Learning</title>
</svelte:head>

<AuthUI isLogin={true} {handleSubmit} isLoading={loading} {hideGoogleAuth}>
  <div class="flex flex-col gap-6">
    <Field.Field>
      <Field.Label for="email">{$t('employees.login_identity')}</Field.Label>
      <Field.Content>
        <Input
          id="email"
          type="text"
          bind:value={fields.email}
          data-testid="auth-login-email"
          oninput={handleEmailChange}
          placeholder={$t('employees.login_placeholder')}
          disabled={loading || isEmailPrefilled}
          readonly={isEmailPrefilled}
          autofocus
          aria-invalid={errors.email ? 'true' : undefined}
          autocomplete="username"
        />
        {#if errors.email}
          <Field.Error>{$t(errors.email)}</Field.Error>
        {/if}
      </Field.Content>
    </Field.Field>

    {#if !($globalStore.isOrgSite && $currentOrg.disableEmailPassword)}
      <Field.Field>
        <div class="flex items-center justify-between">
          <Field.Label for="password">{$t('login.password')}</Field.Label>
          <a class="ui:text-primary text-sm hover:underline" href={resolve('/forgot', {})}>
            {$t('login.forgot')}
          </a>
        </div>
        <Field.Content>
          <Password
            id="password"
            bind:value={fields.password}
            data-testid="auth-login-password"
            placeholder="************"
            showPasswordTooltip={$t('employees.show_password')}
            hidePasswordTooltip={$t('employees.hide_password')}
            showPasswordAriaLabel={$t('employees.show_password')}
            hidePasswordAriaLabel={$t('employees.hide_password')}
            disabled={loading}
            aria-invalid={errors.password ? 'true' : undefined}
            autocomplete="current-password"
          />
          {#if errors.password}
            <Field.Error>{$t(errors.password)}</Field.Error>
          {/if}
        </Field.Content>
      </Field.Field>

      {#if submitError}
        <p class="ui:text-destructive text-sm">{submitError}</p>
      {/if}

      <Button type="submit" disabled={loading} {loading} class="w-full" testId="auth-login-submit">
        {$t('login.login')}
      </Button>
    {:else}
      <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <p class="text-sm text-amber-800 dark:text-amber-200">
          {$t('settings.auth.login.email_password_disabled_message')}
        </p>
      </div>
    {/if}
  </div>
</AuthUI>
