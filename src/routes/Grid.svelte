<script>
	import Selection from "./Selection.svelte.js"
	import { css_value_to_px } from "./utils.js"
	let {
		headers = $bindable(),
		data = $bindable(),
		height: grid_height = $bindable(),
		row_height = $bindable("32px"),
		row_number_column_width = $bindable("32px"),
		border_color =  $bindable("hsl(0, 0%, 80%)"),
		max_render_extra_above = 3,
		max_render_extra_below = 3,
		row_column_item
	} = $props();
	let visible_headers = $derived(headers.filter(x => x.visible !== false));
	let container = $state();
	let table_width = $derived(headers.reduce((width, x) => x.visible === false ? 0 : width + css_value_to_px(x.width), 0));
	let row_number_column = $derived(css_value_to_px(row_number_column_width))
	let active = $state(false);
	let selecting = $state(false);
	let selections = $state([]);
	let status = $state();
	let active_record = $state();
	let active_header = $state();

	let header_row_height = $state();
	let data_grid_height = $state();
	let data_row_height = $state();

	let scroll_value = $state(0);
	let scroll_height = $derived(data.length * data_row_height + header_row_height)
	let visible_records = $derived(data_grid_height / data_row_height | 0 + max_render_extra_above + max_render_extra_below);
	let start_record_index = $derived(
		Math.max(
			0,
			Math.min(
				data.length - 1 - visible_records - max_render_extra_above,
				Math.max(
					0,
					(scroll_value / (scroll_height - data_grid_height) * (data.length - visible_records) | 0) - max_render_extra_above
				)
			)
		)
	);
	let end_record_index = $derived(Math.min(data.length -1, start_record_index + visible_records + max_render_extra_below));

	let clicked_position = $state();
	let last_grid_position = $state();
	
	function onpointerdown (e, record, header, row, col) {
		if (record === active_record && header === active_header) return;
		if (row === -1) return;
		clicked_position = { x: e.clientX, y: e.clientY };
		active = true;
		selecting = true;
		selections = [new Selection({ row, col })]
		if (record !== active_record || header !== active_header) {
			active_record = undefined;
			active_header = undefined;
		}
	}
	function onpointerup (record, header, row, col) {
		if (!active) return;
		if (selecting && row !== undefined && col !== undefined) {
			let selection = selections.pop();
			selection.end = { row, col }
			selections.push(selection);
		}
		selecting = false;
	}
	function ondblclick (record, header) {
		active_record = record;
		active_header = header;
	}
	function onfocus (e) {
		
	}
	function onpointermove (e) {
		if (!active) return;
	}
	function onpointerleave (e) {
		last_grid_position = { x: e.clientX, y: e.clientY };
	}
	function onpointerenter (record, header, row, col) {
		if (selecting) {
			let selection = selections.pop();
			selection.end = { row, col }
			selections.push(selection);
		}
	}

	function onscroll (e) {
		scroll_value = e.target.scrollTop;
	}

	function onpagescroll () {
		const page_scroll_top = document.documentElement.scrollTop;
		const page_scroll_height = document.documentElement.scrollHeight;
		const client_height = document.documentElement.clientHeight;
		const rect = container.getBoundingClientRect()
		console.log(rect.top + page_scroll_top, rect.bottom + page_scroll_top, page_scroll_top, page_scroll_height, client_height, page_scroll_top / (page_scroll_height - client_height))
	}
</script>
{visible_records}
{status} {data_grid_height} {scroll_height}<br>
<svelte:window {onpointerup} onscroll={onpagescroll} onpointermove={selecting ? onpointermove : undefined} />

<div class="dg-wrapper" bind:this={container} bind:clientHeight={data_grid_height} {onscroll} style:height="{grid_height ? grid_height : ""}" {onpointerleave}>
	<table style:width="{table_width}px">
		<colgroup>
			{#if row_number_column > 0}
			<col style:min-width="{row_number_column_width ? row_number_column_width : "100px"}" style:width="{row_number_column_width ? row_number_column_width : "32px"}" />
			{/if}
			{#each visible_headers as { key, caption, width, visible }, i}
			<col style:min-width="{width ? width : "100px"}" style:width="{width ? width : "100px"}" />
			{/each}
		</colgroup>
		<thead>
			<tr style:background-color="white" bind:clientHeight={header_row_height}>
				{#if row_number_column > 0}
				<th style:min-width={row_number_column_width} style:width={row_number_column_width}>
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
					{onpointerenter}
					onfocus={onpointerenter} data-row={-1} data-col={col}>
						<div>{caption}</div></th>
				{/each}
			</tr>
		</thead>
		<tbody>
			<tr class="virtual" data-virtual-upper>
				<td style:min-width={row_number_column_width} style:width={row_number_column_width}>
					<div style:height="{data_row_height * start_record_index}px"></div>
				</td>
			</tr>
			{#each { length: end_record_index - start_record_index + 1 }, i}
			{@const row = start_record_index + i}
			{@const record = data[row]}
			{@const bottom_border = row === data.length - 1}
			<tr class="data-row" bind:clientHeight={data_row_height}>
				{#if row_number_column > 0}
				<td style:min-width={row_number_column_width} style:width={row_number_column_width}>
					<div
						style:border-left-color={"hsl(0, 0%, 80%)"}
						style:border-top-color={"hsl(0, 0%, 80%)"}
						style:border-bottom-color={bottom_border ? "hsl(0, 0%, 80%)" : ""}
						style:border-bottom-width={bottom_border ? "1px" : "none"}
						style:height={row_height}>
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
				{@const { is_selected, left_selected, top_selected, right_selected, bottom_selected } = selections.reduce((obj, x) => {
					const [tl, tr, bl, br] = x.rect();
					obj.is_selected = active && (obj.is_selected || row >= tl.row && row <= bl.row && col >= tl.col && col <= tr.col);
					obj.left_selected = (col === tl.col || col - 1 === tr.col) && row >= tl.row && row <= bl.row;
					obj.right_selected = col === tr.col && row >= tl.row && row <= bl.row;
					obj.top_selected = (row === tl.row || row -1 === bl.row) && col >= tl.col && col <= tr.col;
					obj.bottom_selected = row === bl.row && col >= tl.col && col <= tr.col;
					return obj;
				}, { is_selected: false, left_selected: false, top_selected: false, right_selected: false, bottom_selected: false })}
				<td style:min-width="{width ? width : "100px"}" style:width="{width ? width : "100px"}">
					<div
						ondblclick={() => ondblclick(record, header)}
						onpointerdown={(e) => onpointerdown(e, record, header, row, col)}
						onpointerup={() => onpointerup(record, header, row, col)}
						onpointerenter={() => onpointerenter(record, header, row, col)}
						{onfocus}
						role="gridcell"
						tabindex={row * visible_headers.length + col}
						data-dgrow={row}
						data-dgcol={col}
						style:height={row_height}
						style:border-left-color={left_selected ? "hsla(220,100%,50%,0.8)" : "hsl(0, 0%, 90%)"}
						style:border-top-color={top_selected ? "hsla(220,100%,50%,0.8)" : "hsl(0, 0%, 90%)"}
						style:border-right-color={right_selected ? "hsla(220,100%,50%,0.8)" : "hsl(0, 0%, 90%)"}
						style:border-bottom-color={bottom_selected ? "hsla(220,100%,50%,0.8)" : "hsl(0, 0%, 90%)"}
						style:background={is_selected ? "hsla(220,100%,90%,0.4)" : ""}
						style:border-right-width={right_border ? "1px" : "none"}
						style:border-bottom-width={bottom_border ? "1px" : "none"}>
							{#if header === active_header && record === active_record}
								<textarea bind:value={record[key]} rows=1 cols=1></textarea>
							{:else}
								{record[key]}
							{/if}
					</div>
				</td>
				{/each}
			</tr>
			{/each}
			<tr class="virtual" data-virtual-lower>
				<td style:min-width={row_number_column_width} style:width={row_number_column_width}>
					<div style:height="{data_row_height * (data.length - 1 - end_record_index)}px"></div>
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