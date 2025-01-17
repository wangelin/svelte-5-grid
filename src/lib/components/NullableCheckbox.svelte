<script lang="ts">
  interface Props {
    checked: boolean | null;
    [key: string]: unknown;
  }

  let { checked = $bindable(null), ...rest }: Props = $props();

  let disable_onchange_event = false;
  function onchange(
    event: Event & {
      currentTarget: EventTarget & HTMLInputElement;
    }
  ) {
    if (disable_onchange_event) return;

    if (checked === null) {
      checked = true;
    } else if (checked === true) {
      checked = false;
    } else {
      checked = null;
    }
  }
  interface ChangeActionOptions {
    checked: boolean | undefined;
  }
  function change(node: HTMLInputElement, { checked }: ChangeActionOptions) {
    function update({ checked }: ChangeActionOptions) {
      disable_onchange_event = true;
      if (checked) {
        node.checked = true;
      } else {
        node.checked = false;
      }
      disable_onchange_event = false;
    }
    update({ checked });
    return { update };
  }
</script>

{#if checked === null}
  <button onclick={() => (checked = true)} {...rest}>null</button>
{:else}
  <input
    type="checkbox"
    class:disabled={checked === null}
    {onchange}
    use:change={{ checked }}
    {...rest}
  />
{/if}

<style>
  input[type="checkbox"]::before {
    position: relative;
  }
  button {
    font-size: xx-small;
  }
</style>
