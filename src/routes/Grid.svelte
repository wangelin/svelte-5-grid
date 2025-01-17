<script lang="ts">
  import Selection from "./Selection.svelte.js";
  import { css_value_to_px } from "./utils.js";
  import type { DataRecord, Header, Position } from "$lib/types";
  import type { Snippet } from "svelte";
  import {
    scrollX,
    scrollY,
    innerWidth,
    innerHeight,
  } from "svelte/reactivity/window";
  import { get_visible_part, type VisiblePartRect } from "$lib/dom-utils.js";
  import { SvelteMap } from "svelte/reactivity";
  import { create_multi_sort, string_to_boolean } from "$lib/utils.js";
  import {
    calculate_similarity,
    create_detailed_search_map,
    generate_trigrams,
  } from "$lib/n-grams.js";

  let debug = false;

  interface Props {
    headers: Header[];
    data: DataRecord[];
    height?: string;
    selectable?: boolean;
    header_height?: string;
    row_height?: string;
    row_number_column_width?: string;
    max_render_extra_above?: number;
    max_render_extra_below?: number;
    row_column_item?: Snippet<[number]>;
    onsort?: (type: "asc" | "desc", header: Header, event: Event) => void;
    onsearch?: (search: string, header: Header, event: Event) => void;
    sort?: SvelteMap<string, "asc" | "desc">;
    search?: SvelteMap<string, string>;
  }

  let {
    headers = $bindable(),
    data = $bindable(),
    height: grid_height = $bindable(),
    selectable = true,
    header_height: header_row_height = $bindable("32px"),
    row_height: data_row_height = $bindable("32px"),
    row_number_column_width = $bindable("0"),
    max_render_extra_above = 5,
    max_render_extra_below = 5,
    row_column_item,
    onsort,
    onsearch,
    sort = $bindable(new SvelteMap<string, "asc" | "desc">()),
    search = $bindable(new SvelteMap<string, string>()),
  }: Props = $props();

  let search_data = $derived(create_detailed_search_map(data));

  let sort_criterias = $derived(
    [...sort.entries()].map(([key, type]) => ({ key, type }))
  );
  let sorter = $derived(create_multi_sort(sort_criterias));
  let sorted_data = $derived([...data].sort(sorter));

  let visible_headers = $derived(headers.filter((x) => x.visible !== false));

  let container: HTMLElement | null = $state(null);
  let rect = $derived.by<DOMRect | null>(() => {
    if (
      container &&
      data_grid_height &&
      contentRect && // This is strange but I seem to need it.
      (innerHeight.current ?? 0) >= 0 &&
      (scrollY.current ?? 0) >= 0 &&
      scroll_value >= 0
    ) {
      return container.getBoundingClientRect();
    }
    return null;
  });
  let visible_part = $derived.by<VisiblePartRect | null>(() => {
    if (rect) {
      return get_visible_part(rect);
    }
    return null;
  });
  let table_width = $derived(
    headers.reduce(
      (width, x) =>
        x.visible === false ? 0 : width + css_value_to_px(x.width),
      0
    )
  );

  let row_number_column_pixel_width = $derived(
    css_value_to_px(row_number_column_width)
  );
  let active = $state(false);
  let selecting = $state(false);
  let selections: Selection[] = $state([]);
  let status = $state();
  let active_cell: { row: number; col: number } | undefined = $state();
  let active_record: DataRecord | undefined = $state();
  let active_header: Header | undefined = $state();
  let open_search: Header | undefined = $state();

  let actual_header_row_height: number = $state(0);
  let data_grid_height: number = $state(0);
  let data_height: number = $derived(
    data_grid_height - actual_header_row_height
  );
  let contentRect: DOMRectReadOnly | undefined = $state();
  let actual_data_row_height: number = $state(0);

  let scroll_value = $state(0);
  let scroll_height = $derived(
    data.length * actual_data_row_height + actual_header_row_height
  );
  let max_scroll_value = $derived(scroll_height - data_grid_height);

  let start_record_index = $derived.by(() => {
    if (rect === null || visible_part === null || scrollY.current === undefined)
      return 0;
    const records_above_scroll_view = scroll_value / actual_data_row_height;
    const first_record_position =
      rect.top + scrollY.current + actual_header_row_height;
    const hidden_records_above =
      ((visible_part.top - first_record_position) / actual_data_row_height) | 0;

    let first_record_index_to_render = records_above_scroll_view | 0;
    first_record_index_to_render += hidden_records_above;
    first_record_index_to_render -= max_render_extra_above;
    if (first_record_index_to_render < 0) first_record_index_to_render = 0;
    return first_record_index_to_render;
  });

  let end_record_index = $derived.by(() => {
    if (rect === null || visible_part === null || scrollY.current === undefined)
      return data.length - 1;
    const records_below_scroll_view =
      (scroll_height - scroll_value - data_grid_height) /
      actual_data_row_height;
    const last_record_position =
      rect.bottom +
      scrollY.current +
      actual_header_row_height -
      actual_data_row_height;
    const hidden_records_below =
      ((last_record_position - visible_part.bottom) / actual_data_row_height) |
      0;

    let last_record_index_to_render =
      data.length - (records_below_scroll_view | 0);
    last_record_index_to_render -= hidden_records_below;
    last_record_index_to_render += max_render_extra_below;
    if (last_record_index_to_render > data.length - 1)
      last_record_index_to_render = data.length - 1;

    return last_record_index_to_render;
  });

  let last_grid_position: Position | undefined = $state();

  function onpointerdown(
    e: PointerEvent,
    record: DataRecord | undefined,
    header: Header,
    row: number,
    col: number
  ) {
    e.stopPropagation();
    if (record === active_record && header === active_header) return;
    if (row === -1) {
      open_search = header;
      return;
    }
    open_search = undefined;
    active = true;
    selecting = true;

    selections = [new Selection({ row, col })];
    if (active_cell?.row === row && active_cell?.col === col) {
      active_record = record;
      active_header = header;
      selecting = false;
    } else {
      active_cell = { row, col };
    }
    if (record !== active_record || header !== active_header) {
      active_record = undefined;
      active_header = undefined;
    }
    pointer_position = { x: e.clientX, y: e.clientY };
    scroll();
  }
  function onpointerup(
    e: PointerEvent,
    row: number,
    col: number,
    record?: DataRecord,
    header?: Header
  ) {
    e.stopPropagation();
    if (!active) return;
    if (selections.length === 0) return;
    if (selecting && row !== -1 && col !== -1) {
      let selection = selections.pop() as Selection;
      selection.end = { row, col };
      selections.push(selection);
    }
    selecting = false;
    pointer_position = { x: e.clientX, y: e.clientY };
  }
  function ondblclick(record: DataRecord, header: Header) {
    active_record = record;
    active_header = header;
  }
  function onfocus(e: FocusEvent) {}
  let shift_key = $state(false);
  let pointer_position: { x: number; y: number } | undefined;
  function onpointermove(e: PointerEvent) {
    if (!active) return;
    pointer_position = { x: e.clientX, y: e.clientY };
  }
  function scroll() {
    if (
      !container ||
      !selecting ||
      !pointer_position ||
      !visible_part ||
      scrollY.current === undefined
    )
      return;
    if (pointer_position.y < visible_part.top - (scrollY?.current ?? 0)) {
      let y = visible_part.top - (scrollY?.current ?? 0) - pointer_position.y;
      if (container.scrollHeight > container.clientHeight) {
        container.scrollTo({
          top: container.scrollTop - y * (shift_key ? 10 : 1),
        });
      } else {
        window.scrollTo({
          top: (scrollY.current ?? 0) - y * (shift_key ? 10 : 1),
        });
      }
    }

    if (pointer_position.y > visible_part.bottom - (scrollY.current ?? 0)) {
      let y =
        pointer_position.y - (visible_part.bottom - (scrollY.current ?? 0));
      if (container.scrollHeight > container.clientHeight) {
        container.scrollTo({
          top: container.scrollTop + y * (shift_key ? 10 : 1),
        });
      } else {
        window.scrollTo({
          top: (scrollY.current ?? 0) + y * (shift_key ? 10 : 1),
        });
      }
    }
    setTimeout(scroll, 50);
  }
  function onpointerleave(e: PointerEvent) {
    last_grid_position = { x: e.clientX, y: e.clientY };
  }
  function onpointerenter(
    record: DataRecord | null,
    header: Header,
    row: number,
    col: number
  ) {
    if (selecting && selections.length > 0) {
      let selection = selections.pop() as Selection;
      selection.end = { row, col };
      selections.push(selection);
    }
  }

  function onscroll(e: UIEvent) {
    const target = e.target as HTMLElement;
    scroll_value = target?.scrollTop ?? 0;
  }

  function handle_sort(type: "asc" | "desc", header: Header) {
    let key = header.key;
    if (sort.has(key)) {
      if (sort.get(key) === type) {
        sort.delete(key);
      } else {
        sort.set(key, type);
      }
    } else {
      sort.set(key, type);
    }
  }
</script>

{#if debug}
  <pre style:position="fixed" style:top="1em" style:right="1em">
status: {status}
shift_key: {shift_key}
start_record_index: {start_record_index}
end_record_index: {end_record_index}
header_row_height: {actual_header_row_height}
data_grid_height: {data_grid_height}
data_height: {data_height}
data_row_height: {actual_data_row_height}
scroll_value: {scroll_value}
max_scroll_value: {max_scroll_value}
scroll_height: {scroll_height}
scrollX: {scrollX.current}
scrollY: {scrollY.current}
innerWidth: {innerWidth.current}
innerHeight: {innerHeight.current}
visible_part?.top: {visible_part?.top}
visible_part?.bottom: {visible_part?.bottom}
visible_part?.left: {visible_part?.left}
visible_part?.right: {visible_part?.right}
visible_part?.width: {visible_part?.width}
visible_part?.height: {visible_part?.height}
rect.bottom: {rect?.bottom}
rect.height: {rect?.height}
rect.left: {rect?.left}
rect.right: {rect?.right}
rect.top: {rect?.top}
rect.width: {rect?.width}
rect.x: {rect?.x}
rect.y: {rect?.y}
Data length {data.length}
</pre>
{/if}

<svelte:window
  onkeydown={(e) => {
    shift_key = e.key === "Shift";
  }}
  onkeyup={(e) => {
    if (e.key === "Shift") shift_key = false;
  }}
  onpointerdown={() => (active = false)}
  onpointerup={(e) => onpointerup(e, -1, -1)}
  onpointermove={selecting ? onpointermove : undefined}
/>

<div
  class={["dg-wrapper", { active }]}
  bind:this={container}
  bind:clientHeight={data_grid_height}
  bind:contentRect
  {onscroll}
  style:height={grid_height ? grid_height : ""}
  {onpointerleave}
>
  <table style:width="{table_width}px">
    <colgroup>
      {#if row_number_column_pixel_width > 0}
        <col
          style:min-width={row_number_column_width
            ? row_number_column_width
            : "100px"}
          style:width={row_number_column_width
            ? row_number_column_width
            : "32px"}
        />
      {/if}
      {#each visible_headers as { key, caption, width, visible }, i}
        <col
          style:min-width={width ? width : "100px"}
          style:width={width ? width : "100px"}
        />
      {/each}
    </colgroup>
    <thead>
      <tr
        style:background-color="white"
        bind:clientHeight={actual_header_row_height}
        style:height={header_row_height}
      >
        {#if row_number_column_pixel_width > 0}
          <th
            style:min-width={row_number_column_width}
            style:width={row_number_column_width}
            style:height={header_row_height}
          >
            {#if row_column_item}
              {@render row_column_item(-1)}
            {:else}
              Row
            {/if}
          </th>
        {/if}
        {#each visible_headers as header, col}
          {@const { key, caption, visible, width } = header}
          <th
            onpointerdown={(e) => onpointerdown(e, undefined, header, -1, col)}
            onpointerenter={() => onpointerenter(null, header, -1, col)}
            data-row={-1}
            data-col={col}
            style:height={header_row_height}
          >
            <div style:display="flex" style:align-items="center">
              {#if header === open_search}
                <input
                  type="text"
                  style:flex="1"
                  placeholder={caption}
                  value={search.get(header.key) ?? ""}
                  oninput={(
                    e: Event & { currentTarget: EventTarget & HTMLInputElement }
                  ) => {
                    const { value } = e.currentTarget;
                    if (value === "" && search.get(header.key)) {
                      search.delete(header.key);
                    } else {
                      search.set(header.key, value);
                      const search_trigram = generate_trigrams(value);
                      const tmp = [...search_data.entries()].filter(
                        ([rec, map]) => {
                          const key_value = rec[header.key];
                          switch (header.type) {
                            case "number":
                              return (
                                parseFloat(value) === parseFloat(key_value)
                              );
                            case "boolean":
                              return (
                                string_to_boolean(value) &&
                                (typeof key_value === "string"
                                  ? string_to_boolean(key_value)
                                  : key_value)
                              );
                            default: // text, multiline, select, snippet, component
                              if (
                                key_value
                                  .toLowerCase()
                                  .startsWith(value.toLowerCase()) ||
                                key_value
                                  .toLowerCase()
                                  .endsWith(value.toLowerCase())
                              ) {
                                return true;
                              }

                              if (map.has(header.key)) {
                                const trigrams = map.get(header.key)!;
                                const score = calculate_similarity(
                                  search_trigram,
                                  trigrams
                                );
                                return score > 0.5;
                              }
                              return false;
                          }
                        }
                      );
                      console.log(tmp);
                    }
                  }}
                />
              {:else}
                <div
                  style:flex="1 1 0"
                  style:overflow="hidden"
                  style:text-overflow="ellipsis"
                >
                  {caption}
                </div>
              {/if}
              <div
                style:display="flex"
                style:flex-direction="column"
                style:align-self="stretch"
              >
                <button
                  class="asc"
                  class:active={sort.has(header.key) &&
                    sort.get(header.key) === "asc"}
                  style:flex="1"
                  aria-label="asc"
                  onclick={(e) => {
                    handle_sort("asc", header);
                    if (onsort) onsort("asc", header, e);
                  }}
                ></button>
                <button
                  class="desc"
                  class:active={sort.has(header.key) &&
                    sort.get(header.key) === "desc"}
                  style:flex="1"
                  aria-label="desc"
                  onclick={(e) => {
                    handle_sort("desc", header);
                    if (onsort) onsort("desc", header, e);
                  }}
                ></button>
              </div>
            </div>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr class="virtual" data-virtual-upper>
        <td
          style:min-width={row_number_column_width}
          style:width={row_number_column_width}
        >
          <div
            style:height="{actual_data_row_height * start_record_index}px"
          ></div>
        </td>
      </tr>
      {#each { length: end_record_index - start_record_index + 1 }, i}
        {@const row = start_record_index + i}
        {@const record = sorted_data[row]}
        {@const bottom_border = row === data.length - 1}
        <tr
          class="data-row"
          bind:clientHeight={actual_data_row_height}
          style:height={data_row_height}
        >
          {#if row_number_column_pixel_width > 0}
            <td
              style:min-width={row_number_column_width}
              style:width={row_number_column_width}
              style:height={data_row_height}
            >
              <div
                style:border-left-color={"hsl(0, 0%, 80%)"}
                style:border-top-color={"hsl(0, 0%, 80%)"}
                style:border-bottom-color={bottom_border
                  ? "hsl(0, 0%, 80%)"
                  : ""}
                style:border-bottom-width={bottom_border
                  ? "var(--border-width, var(--dg-border-width))"
                  : "none"}
                style:min-width={row_number_column_width}
                style:width={row_number_column_width}
              >
                {#if row_column_item}
                  {@render row_column_item(row)}
                {:else}
                  {row + 1}
                {/if}
              </div>
            </td>
          {/if}
          {#each visible_headers as header, col}
            {@const { key, caption, visible, width } = header}
            {@const right_border = col === visible_headers.length - 1}
            {@const is_active =
              active_cell?.col === col && active_cell?.row === row}
            {@const {
              is_selected,
              left_selected,
              top_selected,
              right_selected,
              bottom_selected,
            } = selections.reduce(
              (obj, x) => {
                if (!selectable) return obj;
                const [tl, tr, bl, br] = x.rect();
                obj.is_selected =
                  obj.is_selected ||
                  (row >= tl.row &&
                    row <= bl.row &&
                    col >= tl.col &&
                    col <= tr.col);
                obj.left_selected =
                  (col === tl.col || col - 1 === tr.col) &&
                  row >= tl.row &&
                  row <= bl.row;
                obj.right_selected =
                  col === tr.col && row >= tl.row && row <= bl.row;
                obj.top_selected =
                  (row === tl.row || row - 1 === bl.row) &&
                  col >= tl.col &&
                  col <= tr.col;
                obj.bottom_selected =
                  row === bl.row && col >= tl.col && col <= tr.col;
                return obj;
              },
              {
                is_selected: false,
                left_selected: false,
                top_selected: false,
                right_selected: false,
                bottom_selected: false,
              }
            )}
            <td
              style:min-width={width ? width : "100px"}
              style:width={width ? width : "100px"}
            >
              <div
                ondblclick={() => ondblclick(record, header)}
                onpointerdown={(e) =>
                  onpointerdown(e, record, header, row, col)}
                onpointerup={(e) => onpointerup(e, row, col, record, header)}
                onpointerenter={() => onpointerenter(record, header, row, col)}
                {onfocus}
                role="gridcell"
                tabindex={row * visible_headers.length + col}
                data-dgrow={row}
                data-dgcol={col}
                class={[
                  "cell",
                  "base",
                  { is_selected },
                  { left_selected },
                  { top_selected },
                  { right_selected },
                  { bottom_selected },
                ]}
                style:height={data_row_height}
                style:border-right-width={right_border
                  ? "var(--border-width, var(--dg-border-width))"
                  : "none"}
                style:border-bottom-width={bottom_border
                  ? "var(--border-width, var(--dg-border-width))"
                  : "none"}
              >
                {#if header.editable !== false && header === active_header && record === active_record}
                  {#if header.type === "select" && header.options}
                    <select bind:value={record[key]}>
                      {#each header.options ?? [] as { value, caption }}
                        <option {value}>{caption}</option>
                      {/each}
                    </select>
                  {:else if header.type === "number"}
                    <input bind:value={record[key]} type="number" />
                  {:else if header.component}
                    <header.component
                      {record}
                      {key}
                      {header}
                      {...header.props || {}}
                      bind:value={record[key]}
                    />
                  {:else if header.snippet}
                    {@render header.snippet(record, key, "input")}
                  {:else if header.type === "boolean"}
                    <input
                      type="checkbox"
                      bind:checked={record[key]}
                      onpointerdown={(e: PointerEvent) => e.stopPropagation()}
                    />
                  {:else if header.type === "multiline"}
                    <textarea
                      bind:value={record[key]}
                      rows="1"
                      cols="1"
                      onpointerdown={(e: PointerEvent) => e.stopPropagation()}
                    ></textarea>
                  {:else}
                    <input
                      type="text"
                      bind:value={record[key]}
                      onpointerdown={(e: PointerEvent) => e.stopPropagation()}
                    />
                  {/if}
                {:else if header.snippet}
                  {@render header.snippet(record, key, "display")}
                {:else if header.type === "boolean"}
                  <input
                    type="checkbox"
                    bind:checked={record[key]}
                    onpointerdown={(e: PointerEvent) => e.stopPropagation()}
                  />
                {:else if header.type === "multiline"}
                  <div
                    class="multiline"
                    style:min-width={width ? width : "100px"}
                    style:width={width ? width : "100px"}
                  >
                    {record[key]}
                  </div>
                {:else}
                  {record[key]}
                {/if}
              </div>
            </td>
          {/each}
        </tr>
      {/each}
      <tr class="virtual" data-virtual-lower>
        <td
          style:min-width={row_number_column_width}
          style:width={row_number_column_width}
        >
          <div
            style:height="{actual_data_row_height *
              (data.length - 1 - end_record_index)}px"
          ></div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<style>
  .dg-wrapper {
    --dg-background-color-selected: hsla(205, 100%, 90%, 0.4);
    --dg-border-color-selected: hsla(205, 100%, 50%, 0.8);
    --dg-border-color-inner-selected: hsla(205, 100%, 70%, 0.4);
    --dg-border-width: 1px;
    user-select: none;
    display: inline-block;
    overflow-y: auto;
  }
  .cell {
    border-left-color: hsl(0, 0%, 90%);
    border-top-color: hsl(0, 0%, 90%);
    border-right-color: hsl(0, 0%, 90%);
    border-bottom-color: hsl(0, 0%, 90%);
  }
  .is_selected {
    background-color: var(
      --background-color-selected,
      var(--dg-background-color-selected)
    );
    border-color: var(
      --border-color-inner-selected,
      var(--dg-border-color-inner-selected)
    );
  }
  .left_selected {
    border-left-color: var(
      --border-color-selected,
      var(--dg-border-color-selected)
    );
  }
  .top_selected {
    border-top-color: var(
      --border-color-selected,
      var(--dg-border-color-selected)
    );
  }
  .right_selected {
    border-right-color: var(
      --border-color-selected,
      var(--dg-border-color-selected)
    );
  }
  .bottom_selected {
    border-bottom-color: var(
      --border-color-selected,
      var(--dg-border-color-selected)
    );
  }
  * {
    box-sizing: border-box;
  }
  table {
    position: relative;
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
  }
  tbody {
    width: 100%;
  }
  th {
    background-color: white;
    font-weight: normal;
    text-align: left;
    overflow: hidden;
    top: 0;
    position: sticky;
  }
  th input[type="text"],
  td input[type="text"],
  td textarea {
    min-width: 0;
    border: none;
    background: transparent;
    outline: none;
    font: inherit;
    color: inherit;
    padding: 0;
    margin: 0;
  }
  td input[type="checkbox"] {
    margin: 0 auto;
    max-width: 50%;
  }
  td {
    overflow: hidden;
    padding: 0;
  }

  tr.data-row > td > div {
    border-left-width: var(--border-width, var(--dg-border-width));
    border-top-width: var(--border-width, var(--dg-border-width));
    border-right-width: 0;
    border-bottom-width: 0;
    border-style: solid;
    display: flex;
    align-items: center;
  }
  div.base > * {
    display: block;
    flex: 1;
    min-width: 0;
    height: 100%;
    width: 100%;
    font-family: sans-serif;
  }
  div.base > div.multiline {
    height: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  td > div > textarea {
    resize: none;
    scrollbar-width: none;
  }
  button.asc,
  button.desc {
    background-color: transparent;
    outline: none;
    border: none;
    background-position: center;
    background-size: contain;
  }
  button.asc {
    /* background-image: url($lib/icons/caret-up.svg); */
    -webkit-mask: url($lib/icons/caret-up.svg) no-repeat center;
    background-color: rgba(0, 0, 0, 0.5);
    -webkit-mask-size: cover;
    mask: url($lib/icons/caret-up.svg) no-repeat center;
    mask-size: cover;
  }
  button.desc {
    /* background-image: url($lib/icons/caret-down.svg); */
    -webkit-mask: url($lib/icons/caret-down.svg) no-repeat center;
    background-color: rgba(0, 0, 0, 0.5);
    -webkit-mask-size: cover;
    mask: url($lib/icons/caret-down.svg) no-repeat center;
    mask-size: cover;
  }

  button.asc.active,
  button.desc.active {
    background-color: rgba(0, 0, 0, 1);
  }
</style>
