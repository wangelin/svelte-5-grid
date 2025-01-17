<script module lang="ts">
  import type { DataRecord } from "./types";

  export { shout_input };
</script>

{#snippet shout_input(record: DataRecord, key: string)}
  SHOUT {(record[key] ?? "").toUpperCase()}<br />
  <input type="text" bind:value={record[key]} />
{/snippet}
