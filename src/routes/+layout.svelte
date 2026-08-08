<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { initTheme } from '#lib/stores/theme.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(initTheme);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>LChat</title>
	<meta name="description" content="Realtime chat built with SvelteKit + Supabase" />
</svelte:head>

{@render children()}
