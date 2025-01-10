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

  interface Props {
    headers: Header[];
    data: DataRecord[];
    height?: string;
    row_height?: string;
    row_number_column_width?: string;
    max_render_extra_above?: number;
    max_render_extra_below?: number;
    row_column_item?: Snippet<[number]>;
  }

  let {
    headers = $bindable(),
    data = $bindable(),
    height: grid_height = $bindable(),
    row_height = $bindable("32px"),
    row_number_column_width = $bindable("32px"),
    max_render_extra_above = 3,
    max_render_extra_below = 3,
    row_column_item,
  }: Props = $props();

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

  function calculate_visible_records() {
    if (rect === null || visible_part === null || scrollY.current === undefined)
      return;
    const records_above_scroll_view = scroll_value / data_row_height;
    const records_below_scroll_view =
      (scroll_height - scroll_value - data_grid_height) / data_row_height;
    const first_record_position =
      rect.top + scrollY.current + header_row_height;
    const last_record_position =
      rect.bottom + scrollY.current + header_row_height - data_row_height;
    const hidden_records_above =
      ((visible_part.top - first_record_position) / data_row_height) | 0;
    const hidden_records_below =
      ((last_record_position - visible_part.bottom) / data_row_height) | 0;

    let first_record_index_to_render = records_above_scroll_view | 0;
    first_record_index_to_render += hidden_records_above;
    first_record_index_to_render -= max_render_extra_above;
    if (first_record_index_to_render < 0) first_record_index_to_render = 0;
    let last_record_index_to_render =
      data.length - (records_below_scroll_view | 0);
    last_record_index_to_render -= hidden_records_below;
    last_record_index_to_render += max_render_extra_below;
    if (last_record_index_to_render > data.length - 1)
      last_record_index_to_render = data.length - 1;
  }

  let row_number_column = $derived(css_value_to_px(row_number_column_width));
  let active = $state(false);
  let selecting = $state(false);
  let selections: Selection[] = $state([]);
  let status = $state();
  let active_record = $state();
  let active_header = $state();

  let header_row_height: number = $state(0);
  let data_grid_height: number = $state(0);
  let data_height: number = $derived(data_grid_height - header_row_height);
  let contentRect: DOMRectReadOnly | undefined = $state();
  let data_row_height: number = $state(0);

  let scroll_value = $state(0);
  let scroll_height = $derived(
    data.length * data_row_height + header_row_height
  );
  let max_scroll_value = $derived(scroll_height - data_grid_height);
  let visible_records = $derived(
    (data_grid_height / data_row_height) |
      (0 + max_render_extra_above + max_render_extra_below)
  );
  /*
  let start_record_index = $derived(
    Math.max(
      0,
      Math.min(
        data.length - 1 - visible_records - max_render_extra_above,
        Math.max(
          0,
          (((scroll_value / (scroll_height - data_grid_height)) *
            (data.length - visible_records)) |
            0) -
            max_render_extra_above
        )
      )
    )
  );
  */
  //   let start_record_index = $derived(0);
  let start_record_index = $derived.by(() => {
    if (rect === null || visible_part === null || scrollY.current === undefined)
      return 0;
    const records_above_scroll_view = scroll_value / data_row_height;
    const first_record_position =
      rect.top + scrollY.current + header_row_height;
    const hidden_records_above =
      ((visible_part.top - first_record_position) / data_row_height) | 0;

    let first_record_index_to_render = records_above_scroll_view | 0;
    first_record_index_to_render += hidden_records_above;
    first_record_index_to_render -= max_render_extra_above;
    if (first_record_index_to_render < 0) first_record_index_to_render = 0;
    return first_record_index_to_render;
  });
  /*
  let end_record_index = $derived(
    Math.min(
      data.length - 1,
      start_record_index + visible_records + max_render_extra_below
    )
  );
  */
  //   let end_record_index = $derived(data.length - 1);
  let end_record_index = $derived.by(() => {
    if (rect === null || visible_part === null || scrollY.current === undefined)
      return data.length - 1;
    const records_below_scroll_view =
      (scroll_height - scroll_value - data_grid_height) / data_row_height;
    const last_record_position =
      rect.bottom + scrollY.current + header_row_height - data_row_height;
    const hidden_records_below =
      ((last_record_position - visible_part.bottom) / data_row_height) | 0;

    let last_record_index_to_render =
      data.length - (records_below_scroll_view | 0);
    last_record_index_to_render -= hidden_records_below;
    last_record_index_to_render += max_render_extra_below;
    if (last_record_index_to_render > data.length - 1)
      last_record_index_to_render = data.length - 1;

    return last_record_index_to_render;
  });

  let clicked_position = $state();
  let last_grid_position: Position | undefined = $state();

  function onpointerdown(
    e: PointerEvent,
    record: DataRecord | null,
    header: Header,
    row: number,
    col: number
  ) {
    if (record === active_record && header === active_header) return;
    if (row === -1) return;
    clicked_position = { x: e.clientX, y: e.clientY };
    active = true;
    selecting = true;
    selections = [new Selection({ row, col })];
    if (record !== active_record || header !== active_header) {
      active_record = undefined;
      active_header = undefined;
    }
  }
  function onpointerup(
    row: number,
    col: number,
    record?: DataRecord,
    header?: Header
  ) {
    if (!active) return;
    if (selections.length === 0) return;
    if (selecting && row !== undefined && col !== undefined) {
      let selection = selections.pop() as Selection;
      selection.end = { row, col };
      selections.push(selection);
    }
    selecting = false;
  }
  function ondblclick(record: DataRecord, header: Header) {
    active_record = record;
    active_header = header;
  }
  function onfocus(e: FocusEvent) {}
  function onpointermove(e: PointerEvent) {
    if (!active) return;
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
</script>

<pre style:position="fixed" style:top="1em" style:right="1em">
status: {status}
start_record_index: {start_record_index}
end_record_index: {end_record_index}
header_row_height: {header_row_height}
data_grid_height: {data_grid_height}
data_height: {data_height}
data_row_height: {data_row_height}
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

<svelte:window
  onpointerup={() => onpointerup(-1, -1)}
  onpointermove={selecting ? onpointermove : undefined}
/>

<div
  class="dg-wrapper"
  bind:this={container}
  bind:clientHeight={data_grid_height}
  bind:contentRect
  {onscroll}
  style:height={grid_height ? grid_height : ""}
  {onpointerleave}
>
  <table style:width="{table_width}px">
    <colgroup>
      {#if row_number_column > 0}
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
      <tr style:background-color="white" bind:clientHeight={header_row_height}>
        {#if row_number_column > 0}
          <th
            style:min-width={row_number_column_width}
            style:width={row_number_column_width}
          >
            {#if row_column_item}
              {@render row_column_item(-1)}
            {:else}
              {""}
            {/if}
          </th>
        {/if}
        {#each visible_headers as header, col}
          {@const { key, caption, visible, width } = header}
          <th
            onpointerdown={(e) => onpointerdown(e, null, header, -1, col)}
            onpointerenter={() => onpointerenter(null, header, -1, col)}
            data-row={-1}
            data-col={col}
          >
            <div>{caption}</div></th
          >
        {/each}
      </tr>
    </thead>
    <tbody>
      <tr class="virtual" data-virtual-upper>
        <td
          style:min-width={row_number_column_width}
          style:width={row_number_column_width}
        >
          <div style:height="{data_row_height * start_record_index}px"></div>
        </td>
      </tr>
      {#each { length: end_record_index - start_record_index + 1 }, i}
        {@const row = start_record_index + i}
        {@const record = data[row]}
        {@const bottom_border = row === data.length - 1}
        <tr class="data-row" bind:clientHeight={data_row_height}>
          {#if row_number_column > 0}
            <td
              style:min-width={row_number_column_width}
              style:width={row_number_column_width}
            >
              <div
                style:border-left-color={"hsl(0, 0%, 80%)"}
                style:border-top-color={"hsl(0, 0%, 80%)"}
                style:border-bottom-color={bottom_border
                  ? "hsl(0, 0%, 80%)"
                  : ""}
                style:border-bottom-width={bottom_border ? "1px" : "none"}
                style:height={row_height}
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
            {@const {
              is_selected,
              left_selected,
              top_selected,
              right_selected,
              bottom_selected,
            } = selections.reduce(
              (obj, x) => {
                const [tl, tr, bl, br] = x.rect();
                obj.is_selected =
                  active &&
                  (obj.is_selected ||
                    (row >= tl.row &&
                      row <= bl.row &&
                      col >= tl.col &&
                      col <= tr.col));
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
                onpointerup={() => onpointerup(row, col, record, header)}
                onpointerenter={() => onpointerenter(record, header, row, col)}
                {onfocus}
                role="gridcell"
                tabindex={row * visible_headers.length + col}
                data-dgrow={row}
                data-dgcol={col}
                style:height={row_height}
                style:border-left-color={left_selected
                  ? "hsla(220,100%,50%,0.8)"
                  : "hsl(0, 0%, 90%)"}
                style:border-top-color={top_selected
                  ? "hsla(220,100%,50%,0.8)"
                  : "hsl(0, 0%, 90%)"}
                style:border-right-color={right_selected
                  ? "hsla(220,100%,50%,0.8)"
                  : "hsl(0, 0%, 90%)"}
                style:border-bottom-color={bottom_selected
                  ? "hsla(220,100%,50%,0.8)"
                  : "hsl(0, 0%, 90%)"}
                style:background={is_selected ? "hsla(220,100%,90%,0.4)" : ""}
                style:border-right-width={right_border ? "1px" : "none"}
                style:border-bottom-width={bottom_border ? "1px" : "none"}
              >
                {#if header === active_header && record === active_record}
                  <textarea bind:value={record[key]} rows="1" cols="1"
                  ></textarea>
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
            style:height="{data_row_height *
              (data.length - 1 - end_record_index)}px"
          ></div>
        </td>
      </tr>
    </tbody>
  </table>
</div>

<pre>{status}</pre>

<style>
  * {
    box-sizing: border-box;
  }
  .dg-wrapper {
    user-select: none;
    display: inline-block;
    overflow-y: auto;
  }
  table {
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
  }
  thead {
    top: 0;
    position: sticky;
  }
  tbody {
    width: 100%;
  }
  th {
    font-weight: normal;
    text-align: left;
    overflow: hidden;
  }
  td {
    overflow: hidden;
    padding: 0;
  }

  tr.data-row > td > div {
    border-left-width: 1px;
    border-top-width: 1px;
    border-right-width: 0;
    border-bottom-width: 0;
    border-style: solid;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
  }
  td > div > textarea {
    display: block;
    flex: 1;
    min-width: 0;
    resize: none;
    height: 100%;
    width: 100%;
    font-family: sans-serif;
  }
</style>
