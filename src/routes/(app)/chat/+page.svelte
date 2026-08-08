<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { chat } from '#lib/stores/conversations.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';

	onMount(async () => {
		if (chat.conversations.length > 0 && !chat.loadingConversations) {
			goto(`/chat/${chat.conversations[0].id}`, { replaceState: true });
		}
	});
</script>

<div class="flex h-full flex-col">
	<div
		class="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 md:hidden dark:border-zinc-800 dark:bg-zinc-900"
	>
		<button
			onclick={toggleSidebar}
			aria-label="Toggle sidebar"
			class="text-zinc-500 dark:text-zinc-400"
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg
			>
		</button>
		<span class="font-semibold">Chats</span>
	</div>
	<div class="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
		<div
			class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl dark:bg-indigo-950"
		>
			💬
		</div>
		<div>
			<h2 class="text-lg font-semibold">Your messages</h2>
			<p class="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
				{#if chat.conversations.length === 0}
					Start a new conversation with a friend to begin chatting.
				{:else}
					Loading your conversations…
				{/if}
			</p>
		</div>
		{#if chat.conversations.length === 0}
			<a
				href="/new"
				class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
			>
				Start a chat
			</a>
		{/if}
	</div>
</div>
