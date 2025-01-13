<script lang="ts">
  import raw_data from "./data.json";
  import Grid from "./Grid.svelte";
  import type { Header } from "$lib/types";

  let headers = $state<Header[]>([
    { key: "id", caption: "id", width: "50px" },
    { key: "title", caption: "title", width: "150px" },
    { key: "author", caption: "author", width: "125px" },
    { key: "content", caption: "content", width: "150px", visible: false },
    { key: "published_date", caption: "published_date" },
    { key: "views", caption: "views", width: "100px" },
    { key: "likes", caption: "likes", width: "100px", visible: false },
    { key: "comments", caption: "comments", width: "100px", visible: false },
  ]);

  function duplicate_items(array: any[], times: number) {
    const total_length = array.length * times;
    const duplicated_array = new Array(total_length);
    let counter = 1;

    for (let i = 0; i < total_length; i++) {
      const item = array[i % array.length];
      duplicated_array[i] = { ...item, id: counter++ };
    }

    return duplicated_array;
  }

  let data = $state(duplicate_items(raw_data, 100));
</script>

<Grid
  bind:headers
  bind:data
  --border-width="3px"
  --border-color-selected="orange"
  --background-color-selected="yellow"
/>
<!-- <Grid height="20em" bind:headers bind:data /> -->
<!-- <Grid height="2153px" bind:headers bind:data /> -->

<!-- 
<strong>HEADERS</strong>
<pre>{JSON.stringify(headers, null, 2)}</pre>
<strong>DATA</strong>
<pre>{JSON.stringify(data, null, 2)}</pre> -->
