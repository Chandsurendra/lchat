<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { chat } from '#lib/stores/conversations.svelte';
	import { auth } from '#lib/stores/auth.svelte';
	import { signOut } from '#lib/services/auth.service';
	import { theme, toggleTheme } from '#lib/stores/theme.svelte';
	import { closeSidebar } from '#lib/stores/ui.svelte';
	import { conversationTitle, getOtherParticipant } from '#lib/services/conversations.service';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { cn } from '#lib/utils/cn';
	import { timeAgo } from '#lib/utils/time';

	let filter = $state('');

	const filtered = $derived(
		filter.trim()
			? chat.conversations.filter((c) =>
					conversationTitle(c, auth.user?.id ?? '')
						.toLowerCase()
						.includes(filter.toLowerCase())
				)
			: chat.conversations
	);

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}

	function go(path: string) {
		closeSidebar();
		goto(path);
	}
</script>

<nav class="flex h-full w-full flex-col bg-white dark:bg-zinc-900">
	<div class="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
		<a href="/chat" class="flex items-center gap-2">
			<span
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white"
				>L</span
			>
			<span class="text-lg font-bold tracking-tight">LChat</span>
		</a>
		<button
			onclick={() => go('/new')}
			title="Start a new chat"
			aria-label="Start a new chat"
			class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500"
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
		</button>
	</div>

	<div class="px-3 pb-2">
		<input
			bind:value={filter}
			placeholder="Search conversations…"
			class="w-full rounded-lg border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-800"
		/>
	</div>

	<div class="flex items-center gap-1 px-3 pb-2 text-sm">
		<a
			href="/chat"
			class={cn(
				'rounded-md px-3 py-1.5 font-medium transition',
				page.url.pathname.startsWith('/chat')
					? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
					: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
			)}
		>
			Chats
		</a>
		<a
			href="/friends"
			class={cn(
				'rounded-md px-3 py-1.5 font-medium transition',
				page.url.pathname.startsWith('/friends')
					? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
					: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
			)}
		>
			Friends
		</a>
		<a
			href="/settings"
			class={cn(
				'rounded-md px-3 py-1.5 font-medium transition',
				page.url.pathname.startsWith('/settings')
					? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
					: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
			)}
		>
			Settings
		</a>
	</div>

	<div
		class="min-h-0 flex-1 overflow-y-auto border-t border-zinc-200 px-2 py-2 dark:border-zinc-800"
	>
		{#if chat.loadingConversations}
			<p class="px-3 py-8 text-center text-sm text-zinc-400">Loading conversations…</p>
		{:else if filtered.length === 0}
			<div class="px-3 py-8 text-center text-sm text-zinc-400">
				{#if chat.conversations.length === 0}
					<p>No conversations yet.</p>
					<a
						href="/new"
						class="mt-2 inline-block font-medium text-indigo-600 hover:underline dark:text-indigo-400"
						>Start one →</a
					>
				{:else}
					<p>No matches.</p>
				{/if}
			</div>
		{:else}
			{#each filtered as conv (conv.id)}
				{@const other = getOtherParticipant(conv, auth.user?.id ?? '')}
				<button
					onclick={() => go(`/chat/${conv.id}`)}
					class={cn(
						'mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
						chat.activeConversationId === conv.id
							? 'bg-indigo-50 dark:bg-indigo-950/60'
							: 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
					)}
				>
					<Avatar
						src={conv.type === 'group' ? conv.avatar_url : other?.profile.avatar_url}
						name={conversationTitle(conv, auth.user?.id ?? '')}
						size={40}
						status={conv.type === 'direct' ? other?.profile.status : undefined}
					/>
					<div class="min-w-0 flex-1">
						<div class="flex items-baseline justify-between gap-2">
							<span class="truncate text-sm font-semibold"
								>{conversationTitle(conv, auth.user?.id ?? '')}</span
							>
							{#if conv.last_message}
								<span class="shrink-0 text-[11px] text-zinc-400"
									>{timeAgo(conv.last_message.created_at)}</span
								>
							{/if}
						</div>
						<div class="mt-0.5 flex items-center justify-between gap-2">
							<p class="truncate text-xs text-zinc-500 dark:text-zinc-400">
								{#if conv.last_message}
									{#if conv.last_message.deleted_at}
										Deleted message
									{:else if conv.last_message.type === 'image'}
										📷 Photo
									{:else if conv.last_message.type === 'video'}
										🎬 Video
									{:else if conv.last_message.type === 'audio'}
										🎤 Voice note
									{:else if conv.last_message.type === 'file'}
										📎 {conv.last_message.file_name}
									{:else}
										{conv.last_message.sender_id === auth.user?.id ? 'You: ' : ''}{conv.last_message
											.content}
									{/if}
								{:else}
									<span class="text-zinc-400">No messages yet</span>
								{/if}
							</p>
							{#if conv.unread_count > 0}
								<span
									class="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-semibold text-white"
								>
									{conv.unread_count}
								</span>
							{/if}
						</div>
					</div>
				</button>
			{/each}
		{/if}
	</div>

	<div class="flex items-center gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
		<button onclick={() => go('/settings')} title="Edit profile" class="shrink-0">
			<Avatar src={auth.profile?.avatar_url} name={auth.profile?.display_name ?? '?'} size={36} />
		</button>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">{auth.profile?.display_name ?? '…'}</p>
			<p class="truncate text-xs text-zinc-400">@{auth.profile?.username ?? ''}</p>
		</div>
		<button
			onclick={toggleTheme}
			title="Toggle theme"
			aria-label="Toggle theme"
			class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
		>
			{#if theme.dark}
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					><circle cx="12" cy="12" r="4" /><path
						d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
					/></svg
				>
			{:else}
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg
				>
			{/if}
		</button>
		<button
			onclick={handleSignOut}
			title="Sign out"
			aria-label="Sign out"
			class="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path
					d="M16 17l5-5-5-5M21 12H9"
				/></svg
			>
		</button>
	</div>
</nav>
