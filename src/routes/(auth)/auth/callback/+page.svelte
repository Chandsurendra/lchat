<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth, initAuth } from '#lib/stores/auth.svelte';

	onMount(async () => {
		await initAuth();
		if (auth.user) {
			goto('/');
		} else {
			goto('/login?error=Could not finish sign in');
		}
	});
</script>

<div class="flex flex-col items-center gap-3 py-16 text-sm text-zinc-500 dark:text-zinc-400">
	<div
		class="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-zinc-700"
	></div>
	<p>Finishing sign in…</p>
</div>
