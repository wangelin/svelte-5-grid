<script>
	import raw_data from "./data.json";
	import Grid from "./Grid.svelte";

	let headers = $state([
		{ key:"id", caption: "id", width: "50px" },
		{ key:"title", caption: "title", width: "150px" },
		{ key:"author", caption: "author", width: "125px" },
		{ key:"content", caption: "content", width: "150px", visible: false },
		{ key:"published_date", caption: "published_date" },
		{ key:"views", caption: "views", width: "100px" },
		{ key:"likes", caption: "likes", width: "100px", visible: false },
		{ key:"comments", caption: "comments", width: "100px", visible: false },
	])

	let data = $state(raw_data)
</script>

<Grid height="20em" bind:headers bind:data />
<!-- 
<strong>HEADERS</strong>
<pre>{JSON.stringify(headers, null, 2)}</pre>
<strong>DATA</strong>
<pre>{JSON.stringify(data, null, 2)}</pre> -->