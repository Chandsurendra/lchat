<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';

	let { children } = $props();
</script>

<div class="flex min-h-full items-center justify-center px-4 py-12">
	<div class="w-full max-w-md">
		<a href="/" class="mb-8 flex items-center justify-center gap-2">
			<img src={favicon} alt="LChat" class="h-9 w-9" />
			<span class="text-2xl font-bold tracking-tight">LChat</span>
		</a>
		<div
			class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
		>
			{@render children()}
		</div>
	</div>
</div>
