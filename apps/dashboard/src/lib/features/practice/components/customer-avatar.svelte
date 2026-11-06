<script lang="ts">
  import { customerInitial } from '$features/practice/utils/practice-utils';

  interface Props {
    name: string;
    size?: 'sm' | 'md' | 'lg';
  }

  let { name, size = 'md' }: Props = $props();

  const sizeClass = $derived(
    size === 'sm' ? 'size-7 text-xs' : size === 'lg' ? 'size-11 text-base' : 'size-10 text-sm'
  );
</script>

<span
  class="ui:bg-primary/10 ui:text-primary inline-flex shrink-0 items-center justify-center rounded-full font-semibold {sizeClass}"
  aria-hidden="true"
>
  {customerInitial(name)}
</span>
