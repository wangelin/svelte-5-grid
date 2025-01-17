<script lang="ts">
  import raw_data from "./data.json";
  import Grid from "./Grid.svelte";
  import EmojiSlider from "$lib/components/EmojiSlider.svelte";
  import type { DataRecord, Header } from "$lib/types";

  let headers = $state<Header[]>([
    { key: "id", caption: "id", width: "50px", editable: false },
    { key: "title", caption: "title", width: "150px", type: "multiline" },
    { key: "author", caption: "author", width: "125px" },
    { key: "content", caption: "content", width: "150px", visible: false },
    { key: "published_date", caption: "published_date" },
    { key: "views", caption: "views", width: "100px", type: "number" },
    { key: "likes", caption: "likes", width: "100px", visible: false },
    { key: "comments", caption: "comments", width: "100px", visible: false },
    {
      key: "checked",
      caption: "checked",
      width: "2em",
      visible: true,
      type: "boolean",
    },
    {
      key: "ok",
      caption: "ok",
      width: "50px",
      visible: true,
      type: "select",
      options: [
        { value: "", caption: "" },
        { value: "yes", caption: "yep" },
        { value: "no", caption: "no" },
      ],
    },
    {
      key: "snippet",
      caption: "Snippet",
      type: "text",
      snippet: blastoff,
    },
    {
      key: "component",
      caption: "Component",
      type: "text",
      component: EmojiSlider,
      props: {
        index: 0,
        emojis: ["😃", "😢", "🙃"],
      },
    },
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

{#snippet blastoff(record: DataRecord, key: string, mode: "input" | "display")}
  <div
    style:display="flex"
    style:width="100%"
    style:height="100%"
    style:gap="0.5em"
    style:padding="0.25em"
  >
    {#if mode === "input"}
      <span>Age</span>
      <input type="text" bind:value={record[key]} style:min-width="0" />
    {:else}
      {record[key]}
    {/if}
  </div>
{/snippet}

<div class="container">
  <!-- <Grid
    bind:headers
    bind:data
    max_render_extra_above={100}
    max_render_extra_below={100}
  /> -->
  <Grid height="20em" bind:headers bind:data onsort={(type, header) => {}}
  ></Grid>
  <!-- <Grid height="2153px" bind:headers bind:data /> -->
</div>

<!-- 
<strong>HEADERS</strong>
<pre>{JSON.stringify(headers, null, 2)}</pre>
<strong>DATA</strong>
<pre>{JSON.stringify(data, null, 2)}</pre> -->
