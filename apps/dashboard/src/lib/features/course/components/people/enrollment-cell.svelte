<script lang="ts">
  import * as Dialog from '@cio/ui/base/dialog';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { PeopleApi } from '$features/course/api/people.svelte';
  import { EnrollmentStateBadge } from '$features/enrollment';
  import type { CourseEnrollment } from '$features/course/utils/types';

  type Props = {
    courseId: string;
    learnerName: string;
    enrollments: CourseEnrollment[];
    canManage?: boolean;
    onChanged?: () => void;
  };

  let { courseId, learnerName, enrollments, canManage = true, onChanged }: Props = $props();

  const api = new PeopleApi();
  const primary = $derived(enrollments.find((row) => row.kind === 'ASSIGNED') ?? enrollments[0] ?? null);
  let dueDialogOpen = $state(false);
  let waiveDialogOpen = $state(false);
  let revokeDialogOpen = $state(false);
  let dueDraft = $state('');
  let waiveReason = $state('');
  let waiveExpires = $state('');

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), { dateStyle: 'medium' }).format(new Date(value));
  }

  function toLocalInput(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function saveDueDate() {
    if (!primary) return;
    const result = await api.updateEnrollmentDueDate(
      courseId,
      primary.id,
      dueDraft ? new Date(dueDraft).toISOString() : null
    );
    if (!result) return;
    dueDialogOpen = false;
    onChanged?.();
  }

  async function saveWaiver() {
    if (!primary || !waiveReason.trim()) return;
    const result = await api.waiveEnrollment(courseId, primary.id, {
      reason: waiveReason.trim(),
      expiresAt: waiveExpires ? new Date(waiveExpires).toISOString() : null
    });
    if (!result) return;
    waiveDialogOpen = false;
    onChanged?.();
  }

  async function cancelWaiver() {
    if (!primary) return;
    const result = await api.cancelEnrollmentWaiver(courseId, primary.id);
    if (!result) return;
    onChanged?.();
  }

  async function revoke() {
    if (!primary) return;
    const result = await api.revokeEnrollment(courseId, primary.id);
    if (!result) return;
    revokeDialogOpen = false;
    onChanged?.();
  }
</script>

{#if primary}
  <div class="flex flex-wrap items-center gap-1.5 text-xs">
    <Badge variant={primary.kind === 'ASSIGNED' ? 'default' : 'outline'}>{$t(`enrollment.kind.${primary.kind}`)}</Badge>
    <EnrollmentStateBadge state={primary.state} />
    {#if canManage}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="ui:hover:bg-muted rounded-md p-1"
          aria-label={$t('enrollment.how_joined')}
          onclick={(event) => event.stopPropagation()}
        >
          <EllipsisIcon size={14} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
          {#if primary.kind === 'ASSIGNED'}
            <DropdownMenu.Item
              onclick={(event) => {
                event.stopPropagation();
                dueDraft = toLocalInput(primary.dueDate);
                dueDialogOpen = true;
              }}>{$t('enrollment.actions.change_due')}</DropdownMenu.Item
            >
            {#if primary.status === 'ACTIVE'}
              <DropdownMenu.Item
                onclick={(event) => {
                  event.stopPropagation();
                  waiveReason = '';
                  waiveExpires = '';
                  waiveDialogOpen = true;
                }}>{$t('enrollment.actions.waive')}</DropdownMenu.Item
              >
            {:else if primary.status === 'WAIVED'}
              <DropdownMenu.Item
                onclick={(event) => {
                  event.stopPropagation();
                  cancelWaiver();
                }}>{$t('enrollment.actions.cancel_waiver')}</DropdownMenu.Item
              >
            {/if}
          {/if}
          <DropdownMenu.Item
            class="text-red-600"
            onclick={(event) => {
              event.stopPropagation();
              revokeDialogOpen = true;
            }}>{$t('enrollment.actions.revoke')}</DropdownMenu.Item
          >
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {/if}
  </div>
  <p class="ui:text-muted-foreground mt-1 text-xs">
    {#if primary.kind === 'ASSIGNED'}
      {#if primary.dueDate}{$t('enrollment.due')}: {formatDate(primary.dueDate)}{/if}
      {#if primary.batchLabel}
        · {$t('enrollment.batch')}: {primary.batchLabel}{/if}
      {#if primary.assignedByName}
        · {$t('enrollment.assigned_by', { name: primary.assignedByName })}{/if}
    {/if}
    {#if primary.validUntil}
      · {$t('enrollment.valid_until')}: {formatDate(primary.validUntil)}{/if}
  </p>
{:else}
  <span class="ui:text-muted-foreground text-xs">{$t('enrollment.no_enrollment')}</span>
{/if}

<Dialog.Root bind:open={dueDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header><Dialog.Title>{$t('enrollment.actions.change_due')} · {learnerName}</Dialog.Title></Dialog.Header>
    <InputField name="enrollment-due" type="datetime-local" label={$t('enrollment.due_date')} bind:value={dueDraft} />
    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={() => (dueDialogOpen = false)}>{$t('common.cancel')}</Button>
      <Button size="sm" onclick={saveDueDate} loading={api.isLoading}>{$t('common.save')}</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={waiveDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header><Dialog.Title>{$t('enrollment.actions.waive')} · {learnerName}</Dialog.Title></Dialog.Header>
    <TextareaField
      name="enrollment-waive-reason"
      label={$t('enrollment.waive_reason')}
      bind:value={waiveReason}
      rows={3}
    />
    <InputField
      name="enrollment-waive-expires"
      type="date"
      label={$t('enrollment.waive_expires')}
      bind:value={waiveExpires}
    />
    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={() => (waiveDialogOpen = false)}>{$t('common.cancel')}</Button>
      <Button size="sm" onclick={saveWaiver} loading={api.isLoading} disabled={!waiveReason.trim()}
        >{$t('enrollment.actions.waive')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={revokeDialogOpen}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header><Dialog.Title>{$t('enrollment.actions.revoke')}</Dialog.Title></Dialog.Header>
    <p class="text-sm">{$t('enrollment.actions.revoke_confirm', { name: learnerName })}</p>
    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={() => (revokeDialogOpen = false)}>{$t('common.cancel')}</Button>
      <Button size="sm" variant="destructive" onclick={revoke} loading={api.isLoading}
        >{$t('enrollment.actions.revoke')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
