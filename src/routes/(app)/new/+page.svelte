<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '#lib/stores/auth.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import { searchProfiles } from '#lib/services/profiles.service';
	import { getFriendStatuses, sendFriendRequest, getFriends } from '#lib/services/friends.service';
	import { openOrCreateDirect, createGroupConversation } from '#lib/stores/conversations.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import type { ProfileRow } from '#lib/database.types';
	import type { FriendStatus } from '#lib/types';

	let tab = $state<'dm' | 'group'>('dm');
	let query = $state('');
	let results = $state<ProfileRow[]>([]);
	let statuses = $state<Map<string, FriendStatus>>(new Map());
	let searching = $state(false);

	let groupName = $state('');
	let groupDesc = $state('');
	let friends = $state<ProfileRow[]>([]);
	let selected = $state<string[]>([]);
	let creating = $state(false);

	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(doSearch, 300);
	}

	async function doSearch() {
		if (!query.trim()) {
			results = [];
			return;
		}
		if (!auth.user) return;
		searching = true;
		const client = getSupabase();
		const found = await searchProfiles(client, query);
		const withoutMe = found.filter((p) => p.id !== auth.user!.id);
		statuses = await getFriendStatuses(client, auth.user.id, withoutMe);
		results = withoutMe;
		searching = false;
	}

	async function startChat(userId: string) {
		const id = await openOrCreateDirect(userId);
		if (id) goto(`/chat/${id}`);
	}

	async function addFriend(userId: string) {
		if (!auth.user) return;
		const { error } = await sendFriendRequest(getSupabase(), auth.user.id, userId);
		if (!error) statuses.set(userId, 'pending_out');
	}

	async function loadFriends() {
		if (!auth.user) return;
		friends = await getFriends(getSupabase(), auth.user.id);
	}

	async function createGroup() {
		if (!groupName.trim() || selected.length === 0) return;
		creating = true;
		const id = await createGroupConversation({
			name: groupName.trim(),
			description: groupDesc.trim(),
			memberIds: selected
		});
		creating = false;
		if (id) goto(`/chat/${id}`);
	}

	$effect(() => {
		if (tab === 'group' && friends.length === 0) loadFriends();
	});
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<button
			onclick={toggleSidebar}
			aria-label="Toggle sidebar"
			class="text-zinc-500 md:hidden dark:text-zinc-400"
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
		<h1 class="text-xl font-semibold">New conversation</h1>
	</div>

	<div class="mb-6 flex gap-2">
		<button
			onclick={() => (tab = 'dm')}
			class="rounded-full px-4 py-1.5 text-sm font-medium transition {tab === 'dm'
				? 'bg-indigo-600 text-white'
				: 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}"
			>Message</button
		>
		<button
			onclick={() => (tab = 'group')}
			class="rounded-full px-4 py-1.5 text-sm font-medium transition {tab === 'group'
				? 'bg-indigo-600 text-white'
				: 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}"
			>Group</button
		>
	</div>

	{#if tab === 'dm'}
		<div
			class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<input
				bind:value={query}
				oninput={onSearchInput}
				placeholder="Search by username or name…"
				class="w-full rounded-lg border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
			/>
			<div class="mt-3 max-h-96 overflow-y-auto">
				{#if searching}
					<p class="px-2 py-6 text-center text-sm text-zinc-400">Searching…</p>
				{:else if query && results.length === 0}
					<p class="px-2 py-6 text-center text-sm text-zinc-400">No users found</p>
				{:else}
					{#each results as user (user.id)}
						<div
							class="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
						>
							<Avatar src={user.avatar_url} name={user.display_name} size={40} />
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold">{user.display_name}</p>
								<p class="truncate text-xs text-zinc-400">@{user.username}</p>
							</div>
							{#if statuses.get(user.id) === 'friends'}
								<button
									onclick={() => startChat(user.id)}
									class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
									>Message</button
								>
							{:else if statuses.get(user.id) === 'pending_out'}
								<span
									class="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
									>Requested</span
								>
							{:else if statuses.get(user.id) === 'pending_in'}
								<button
									onclick={() => startChat(user.id)}
									class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
									>Message</button
								>
							{:else if statuses.get(user.id) === 'blocked'}
								<span
									class="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
									>Blocked</span
								>
							{:else}
								<button
									onclick={() => addFriend(user.id)}
									class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
									>Add friend</button
								>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<input
				bind:value={groupName}
				placeholder="Group name"
				class="w-full rounded-lg border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
			/>
			<input
				bind:value={groupDesc}
				placeholder="Description (optional)"
				class="w-full rounded-lg border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-800"
			/>
			<div>
				<p class="mb-2 text-sm font-medium">Select members ({selected.length})</p>
				<div class="max-h-72 space-y-1 overflow-y-auto">
					{#if friends.length === 0}
						<p class="px-2 py-4 text-sm text-zinc-400">
							You need friends first — add some on the Friends page.
						</p>
					{/if}
					{#each friends as friend (friend.id)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
						>
							<input
								type="checkbox"
								class="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
								checked={selected.includes(friend.id)}
								onchange={(e) => {
									const checked = (e.currentTarget as HTMLInputElement).checked;
									selected = checked
										? [...selected, friend.id]
										: selected.filter((s) => s !== friend.id);
								}}
							/>
							<Avatar src={friend.avatar_url} name={friend.display_name} size={36} />
							<div class="min-w-0">
								<p class="truncate text-sm font-medium">{friend.display_name}</p>
								<p class="truncate text-xs text-zinc-400">@{friend.username}</p>
							</div>
						</label>
					{/each}
				</div>
			</div>
			<button
				onclick={createGroup}
				disabled={creating || !groupName.trim() || selected.length === 0}
				class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
			>
				{creating ? 'Creating…' : 'Create group'}
			</button>
		</div>
	{/if}
</div>
