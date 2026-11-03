<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { EmployeesApi } from '$features/employees/api/employees.svelte';
  import { t } from '$lib/utils/functions/translations';
  import * as Field from '@cio/ui/base/field';
  import { Password } from '@cio/ui/custom/password';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';

  const api = new EmployeesApi();
  const token = page.url.searchParams.get('token') ?? '';
  let password = $state('');
  let confirmPassword = $state('');
  const invalidPassword = $derived(
    !api.preview?.hasAccount &&
      (password.length < 8 || new TextEncoder().encode(password).length > 72 || password !== confirmPassword)
  );
  onMount(() => {
    void api.loadActivation(token);
  });
</script>

<svelte:head
  ><title>{$t('employees.activate')} · MP Learning</title><meta name="referrer" content="no-referrer" /></svelte:head
>

<main class="ui:bg-background flex min-h-screen items-center justify-center p-6">
  <section class="ui:bg-card ui:border-border w-full max-w-md space-y-6 rounded-2xl border p-8 shadow-sm">
    <h1 class="text-2xl font-semibold">{$t('employees.activate')}</h1>
    {#if api.activated}
      <p data-testid="employee-activation-done">{$t('employees.activation_done')}</p>
      <Button href="/login" class="w-full">{$t('employees.login')}</Button>
    {:else if api.preview}
      <p>{api.preview.fullname} · {api.preview.employeeCode}</p>
      <form
        onsubmit={(event) => {
          event.preventDefault();
          if (!invalidPassword) void api.activate(token, api.preview?.hasAccount ? undefined : password);
        }}
      >
        <Field.Group>
          {#if api.preview.hasAccount}<p class="text-sm">{$t('employees.existing_password')}</p>
          {:else}
            <Field.Field
              ><Field.Label for="activation-password">{$t('employees.password')}</Field.Label><Password
                id="activation-password"
                bind:value={password}
                autocomplete="new-password"
                showPasswordAriaLabel={$t('employees.show_password')}
                hidePasswordAriaLabel={$t('employees.hide_password')}
              /><Field.Description>{$t('employees.password_hint')}</Field.Description></Field.Field
            >
            <Field.Field
              ><Field.Label for="activation-confirm">{$t('employees.confirm_password')}</Field.Label><Password
                id="activation-confirm"
                bind:value={confirmPassword}
                autocomplete="new-password"
                showPasswordAriaLabel={$t('employees.show_password')}
                hidePasswordAriaLabel={$t('employees.hide_password')}
              /></Field.Field
            >
          {/if}
          <Button
            type="submit"
            disabled={invalidPassword || api.isLoading}
            loading={api.isLoading}
            testId="employee-activate">{$t('employees.activate')}</Button
          >
        </Field.Group>
      </form>
    {:else if !api.message}<Skeleton class="h-32 w-full" />{/if}
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
  </section>
</main>
