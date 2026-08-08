<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '#lib/stores/auth.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import {
		getFriends,
		getFriendRequests,
		respondToRequest,
		removeFriend,
		getBlocked,
		unblockUser
	} from '#lib/services/friends.service';
	import { openOrCreateDirect } from '#lib/stores/conversations.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import type { FriendWithProfile } from '#lib/types';
	import type { FriendRequestWithProfile } from '#lib/services/friends.service';
	import type { ProfileRow } from '#lib/database.types';

	let tab = $state<'requests' | 'friends' | 'blocked'>('friends');
	let friends = $state<FriendWithProfile[]>([]);
	let requests = $state<FriendRequestWithProfile[]>([]);
	let blocked = $state<ProfileRow[]>([]);
	let loading = $state(true);
	let busy = $state('');

	onMount(load);

	async function load() {
		if (!auth.user) return;
		loading = true;
		const client = getSupabase();
		const [f, r, b] = await Promise.all([
			getFriends(client, auth.user.id),
			getFriendRequests(client, auth.user.id),
			getBlocked(client, auth.user.id)
		]);
		friends = f;
		requests = r;
		blocked = b;
		loading = false;
	}

	async function accept(req: FriendRequestWithProfile) {
		busy = req.request_id;
		await respondToRequest(getSupabase(), req.request_id, true);
		busy = '';
		requests = requests.filter((x) => x.request_id !== req.request_id);
		load();
	}

	async function decline(req: FriendRequestWithProfile) {
		busy = req.request_id;
		await respondToRequest(getSupabase(), req.request_id, false);
		busy = '';
		requests = requests.filter((x) => x.request_id !== req.request_id);
	}

	async function remove(friend: FriendWithProfile) {
		if (!auth.user) return;
		if (!confirm(`Remove ${friend.display_name} from your friends?`)) return;
		await removeFriend(getSupabase(), auth.user.id, friend.id);
		friends = friends.filter((x) => x.id !== friend.id);
	}

	async function unblock(user: ProfileRow) {
		if (!auth.user) return;
		await unblockUser(getSupabase(), auth.user.id, user.id);
		blocked = blocked.filter((x) => x.id !== user.id);
	}

	async function message(userId: string) {
		const id = await openOrCreateDirect(userId);
		if (id) goto(`/chat/${id}`);
	}
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
		<h1 class="text-xl font-semibold">Friends</h1>
		<a
			href="/new"
			class="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
			>Add people</a
		>
	</div>

	<div class="mb-5 flex gap-2">
		{#each [{ id: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` }, { id: 'friends', label: `Friends${friends.length ? ` (${friends.length})` : ''}` }, { id: 'blocked', label: 'Blocked' }] as t (t.id)}
			<button
				onclick={() => (tab = t.id as typeof tab)}
				class="rounded-full px-4 py-1.5 text-sm font-medium transition {tab === t.id
					? 'bg-indigo-600 text-white'
					: 'bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}"
				>{t.label}</button
			>
		{/each}
	</div>

	<div
		class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
	>
		{#if loading}
			<p class="px-2 py-10 text-center text-sm text-zinc-400">Loading…</p>
		{:else if tab === 'requests'}
			{#if requests.length === 0}
				<p class="px-2 py-10 text-center text-sm text-zinc-400">No pending friend requests</p>
			{/if}
			{#each requests as req (req.request_id)}
				<div class="flex items-center gap-3 rounded-xl px-2 py-2.5">
					<Avatar src={req.avatar_url} name={req.display_name} size={42} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold">{req.display_name}</p>
						<p class="truncate text-xs text-zinc-400">@{req.username} · wants to be friends</p>
					</div>
					<button
						onclick={() => accept(req)}
						disabled={busy === req.request_id}
						class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
						>Accept</button
					>
					<button
						onclick={() => decline(req)}
						disabled={busy === req.request_id}
						class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
						>Decline</button
					>
				</div>
			{/each}
		{:else if tab === 'friends'}
			{#if friends.length === 0}
				<div class="px-2 py-10 text-center">
					<p class="text-sm text-zinc-400">You don't have any friends yet</p>
					<a
						href="/new"
						class="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
						>Find people →</a
					>
				</div>
			{/if}
			{#each friends as friend (friend.id)}
				<div
					class="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
				>
					<Avatar
						src={friend.avatar_url}
						name={friend.display_name}
						size={42}
						status={friend.status}
					/>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold">{friend.display_name}</p>
						<p class="truncate text-xs text-zinc-400">
							@{friend.username}
							{#if friend.bio}<span class="text-zinc-300 dark:text-zinc-600">
									· {friend.bio}</span
								>{/if}
						</p>
					</div>
					<button
						onclick={() => message(friend.id)}
						class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-500"
						>Message</button
					>
					<button
						onclick={() => remove(friend)}
						class="rounded-lg px-2 py-1.5 text-sm text-zinc-400 transition hover:text-red-500"
						title="Remove friend"
					>
						<svg
							class="h-4 w-4"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path
								d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/></svg
						>
					</button>
				</div>
			{/each}
		{:else}
			{#if blocked.length === 0}
				<p class="px-2 py-10 text-center text-sm text-zinc-400">No blocked users</p>
			{/if}
			{#each blocked as user (user.id)}
				<div class="flex items-center gap-3 rounded-xl px-2 py-2.5">
					<Avatar src={user.avatar_url} name={user.display_name} size={42} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold">{user.display_name}</p>
						<p class="truncate text-xs text-zinc-400">@{user.username}</p>
					</div>
					<button
						onclick={() => unblock(user)}
						class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
						>Unblock</button
					>
				</div>
			{/each}
		{/if}
	</div>
</div>
