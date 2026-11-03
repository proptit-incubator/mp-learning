<script lang="ts">
  import * as Dialog from '@cio/ui/base/dialog';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { currentOrgPath } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import { t } from '$lib/utils/functions/translations';
  import { BRAND } from '$lib/utils/constants/brand';

  const open = $derived(page.url.searchParams.get('welcomePopup') === 'true' && !!$profile.isEmailVerified);

  function closeModal() {
    if (page.url.searchParams.get('welcomePopup') === 'true') {
      goto(resolve(`${$currentOrgPath}/courses?create=true`, {}));
    }
  }
</script>

<Dialog.Root
  {open}
  onOpenChange={(isOpen) => {
    if (!isOpen) closeModal();
  }}
>
  <Dialog.Content class="w-[700px]! max-w-none!">
    <Dialog.Header>
      <Dialog.Title>{$t('welcome_modal.title')}</Dialog.Title>
    </Dialog.Header>
    <p class="text-md text-black dark:text-white">
      {$t('welcome_modal.we_at')}
      <span class="ui:text-primary">{BRAND.name}</span>
      {$t('welcome_modal.small_team')}
      <span class="ui:text-primary">{$t('welcome_modal.thank_you')};</span>
      {$t('welcome_modal.deeply_appreciate')}
    </p>
    <img src="/images/welcome-img.svg" alt={$t('welcome_modal.banner_alt')} class="my-6 w-full" />
  </Dialog.Content>
</Dialog.Root>
