<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    emojis: string[];
    value?: any;
  }
  let { emojis = [], value = $bindable() }: Props = $props();
  let index = $state(-1);
  function previous() {
    index = emojis.findIndex((x) => x === value);
    index--;
    if (index < 0) index = emojis.length - 1;
    value = emojis[index];
  }
  function next() {
    index = emojis.findIndex((x) => x === value);
    index++;
    if (index > emojis.length - 1) index = 0;
    value = emojis[index];
  }
  onMount(() => {
    index = emojis.findIndex((x) => x === value);
  });
</script>

{#if emojis.length > 0}
  <button onclick={() => previous()}>-</button>
  <span>{emojis[index]}</span>
  <button onclick={() => next()}>+</button>
{/if}
