<script lang="ts">
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Table from '@cio/ui/base/table';
  import { Button } from '@cio/ui/base/button';
  import { Input } from '@cio/ui/base/input';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Empty } from '@cio/ui/custom/empty';
  import Building2Icon from '@lucide/svelte/icons/building-2';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import { t } from '$lib/utils/functions/translations';
  import { DepartmentsApi } from '../api/departments.svelte';

  interface Props {
    open: boolean;
    onChanged?: () => void;
  }

  let { open = $bindable(false), onChanged = () => {} }: Props = $props();

  const api = new DepartmentsApi();
  let drafts = $state<Record<string, string>>({});

  $effect(() => {
    if (open) void api.load();
  });

  $effect(() => {
    drafts = Object.fromEntries(api.departments.map((department) => [department.id, department.name]));
  });

  async function save(departmentId: string) {
    if (await api.rename(departmentId, drafts[departmentId] ?? '')) onChanged();
  }

  async function remove(departmentId: string) {
    await api.remove(departmentId);
    onChanged();
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-2xl" data-testid="departments-dialog">
    <Dialog.Header
      ><Dialog.Title>{$t('employees.departments.title')}</Dialog.Title><Dialog.Description
        >{$t('employees.departments.description')}</Dialog.Description
      ></Dialog.Header
    >
    {#if api.isLoading && !api.departments.length}
      <div class="space-y-2">
        {#each [0, 1, 2] as index (index)}<Skeleton class="h-10 w-full" />{/each}
      </div>
    {:else if !api.departments.length}
      <Empty icon={Building2Icon} title={$t('employees.departments.empty')} class="md:p-6!" />
    {:else}
      <Table.Root>
        <Table.Header
          ><Table.Row
            ><Table.Head>{$t('employees.department')}</Table.Head><Table.Head class="text-right"
              >{$t('employees.departments.active_employees')}</Table.Head
            ><Table.Head></Table.Head></Table.Row
          ></Table.Header
        >
        <Table.Body>
          {#each api.departments as department (department.id)}
            {@const changed = (drafts[department.id] ?? '').trim() !== department.name}
            <Table.Row
              ><Table.Cell
                ><form
                  class="flex items-center gap-2"
                  onsubmit={(event) => {
                    event.preventDefault();
                    if (changed) void save(department.id);
                  }}
                >
                  <Input
                    bind:value={drafts[department.id]}
                    maxlength={150}
                    aria-label={$t('employees.department')}
                    class="h-9"
                  />
                  {#if changed}<Button
                      type="submit"
                      size="sm"
                      loading={api.savingId === department.id}
                      disabled={!(drafts[department.id] ?? '').trim()}>{$t('employees.departments.save')}</Button
                    >{/if}
                </form></Table.Cell
              ><Table.Cell class="text-right tabular-nums"
                >{department.activeEmployees}<span class="ui:text-muted-foreground text-xs"
                  >/{department.employees}</span
                ></Table.Cell
              ><Table.Cell class="w-10 text-right"
                >{#if department.employees === 0}<Button
                    variant="ghost"
                    size="icon"
                    aria-label={$t('employees.departments.delete')}
                    disabled={api.savingId === department.id}
                    onclick={() => remove(department.id)}><Trash2Icon size={16} /></Button
                  >{/if}</Table.Cell
              ></Table.Row
            >
          {/each}
        </Table.Body>
      </Table.Root>
      <p class="ui:text-muted-foreground text-xs leading-relaxed">{$t('employees.departments.merge_hint')}</p>
    {/if}
  </Dialog.Content>
</Dialog.Root>
