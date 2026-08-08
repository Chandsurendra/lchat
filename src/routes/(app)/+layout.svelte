<script lang="ts">
	import Sidebar from '#lib/components/sidebar/Sidebar.svelte';
	import { ui, closeSidebar } from '#lib/stores/ui.svelte';
	import { auth, updatePresence } from '#lib/stores/auth.svelte';
	import { initRealtime, cleanupRealtime } from '#lib/stores/conversations.svelte';
	import { cn } from '#lib/utils/cn';
	import { onMount } from 'svelte';

	let { children } = $props();

	$effect(() => {
		const userId = auth.user?.id;
		if (userId) {
			const cleanup = initRealtime(userId);
			return () => {
				cleanup();
			};
		} else {
			cleanupRealtime();
		}
	});

	onMount(() => {
		updatePresence('online');
		const onHide = () => updatePresence('offline');
		window.addEventListener('beforeunload', onHide);
		const onVisibility = () => {
			if (document.hidden) updatePresence('offline');
			else updatePresence('online');
		};
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('beforeunload', onHide);
			document.removeEventListener('visibilitychange', onVisibility);
			updatePresence('offline');
		};
	});
</script>

<div class="flex h-dvh overflow-hidden">
	{#if ui.sidebarOpen}
		<button
			aria-label="Close sidebar"
			class="fixed inset-0 z-20 bg-black/40 md:hidden"
			onclick={closeSidebar}
		></button>
	{/if}
	<aside
		class={cn(
			'z-30 h-full w-72 shrink-0 border-r border-zinc-200 md:static md:block dark:border-zinc-800',
			ui.sidebarOpen ? 'fixed inset-y-0 left-0 block' : 'hidden'
		)}
	>
		<Sidebar />
	</aside>
	<main class="h-full min-w-0 flex-1 bg-zinc-100 dark:bg-zinc-950">
		{@render children()}
	</main>
</div>
