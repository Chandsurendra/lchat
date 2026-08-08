<script lang="ts">
	import { untrack } from 'svelte';
	import type { ChangesPayload } from '#lib/services/realtime.service';
	import { auth } from '#lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import {
		chat,
		openConversation,
		applyMessage,
		applyMessageUpdate,
		applyMemberUpdate,
		removeMessage,
		updateMessageLocally,
		markReadNow,
		loadMore,
		loadConversations,
		updateConversationLocally
	} from '#lib/stores/conversations.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import {
		subscribeToConversationChanges,
		subscribeToReactionChanges,
		subscribeToMemberChanges,
		typingChannel,
		presenceChannel
	} from '#lib/services/realtime.service';
	import {
		getMessageById,
		sendMessage,
		editMessage,
		deleteMessage,
		addReaction,
		removeReaction
	} from '#lib/services/messages.service';
	import { uploadAttachment } from '#lib/services/storage.service';
	import {
		conversationTitle,
		getOtherParticipant,
		updateMember,
		updateConversation,
		addConversationMembers,
		removeConversationMember
	} from '#lib/services/conversations.service';
	import { blockUser, getFriends } from '#lib/services/friends.service';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import MessageBubble from './MessageBubble.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import TypingIndicator from './TypingIndicator.svelte';
	import { isSameDay, dayLabel, timeAgo } from '#lib/utils/time';
	import type { MessageWithSender, FriendWithProfile } from '#lib/types';
	import { cn } from '#lib/utils/cn';

	let { conversationId }: { conversationId: string } = $props();

	const conversation = $derived(chat.conversations.find((c) => c.id === conversationId) ?? null);
	const isGroup = $derived(conversation?.type === 'group');
	const other = $derived(
		conversation ? getOtherParticipant(conversation, auth.user?.id ?? '') : null
	);
	const title = $derived(conversation ? conversationTitle(conversation, auth.user?.id ?? '') : '');

	// ---- realtime state ----
	const typingUsers = $state<Record<string, string>>({});
	const onlineUsers = $state<Record<string, boolean>>({});
	const typingTimers: Record<string, ReturnType<typeof setTimeout>> = {};
	const otherOnline = $derived(other ? onlineUsers[other.user_id] === true : false);

	const typingNames = $derived.by(() => {
		const names: string[] = [];
		for (const uid in typingUsers) {
			const p = conversation?.participants.find((x) => x.user_id === uid)?.profile;
			if (p) names.push(p.display_name);
		}
		return names;
	});

	const subtitle = $derived(
		typingNames.length > 0
			? `${typingNames.join(', ')} typing…`
			: isGroup
				? `${conversation!.participants.length} members`
				: other
					? otherOnline
						? 'Online'
						: other.profile.status === 'away'
							? 'Away'
							: other.profile.last_seen
								? `Last seen ${timeAgo(other.profile.last_seen)}`
								: 'Offline'
					: ''
	);

	// ---- composer context ----
	let replyTo = $state<MessageWithSender | null>(null);
	let editing = $state<MessageWithSender | null>(null);
	let typeChannelState = $state<import('@supabase/supabase-js').RealtimeChannel | null>(null);

	// ---- lightbox ----
	let lightboxUrl = $state<string | null>(null);

	// ---- scroll ----
	let messagesEl = $state<HTMLDivElement | null>(null);
	let stick = $state(true);

	function onScroll() {
		if (!messagesEl) return;
		stick = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 120;
		if (messagesEl.scrollTop < 60 && chat.hasMore && !chat.loadingMessages) loadMore();
	}

	function scrollToBottom(smooth = false) {
		if (!messagesEl) return;
		messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
	}

	function needsHeader(idx: number): boolean {
		if (!isGroup) return false;
		const prev = chat.messages[idx - 1];
		return !prev || prev.sender_id !== chat.messages[idx].sender_id;
	}

	// ---- realtime setup ----
	$effect(() => {
		const convId = conversationId;
		const uid = auth.user?.id;
		if (!convId || !uid) return;

		chat.activeUserId = uid;
		untrack(() => {
			openConversation(convId).then(() => {
				const last = chat.messages.at(-1);
				if (last) markReadNow(convId, last.id);
			});
		});

		const client = getSupabase();

		const msgChannel = subscribeToConversationChanges(convId, handlePayload);
		const reactChannel = subscribeToReactionChanges(handleReaction);
		const memberChannel = subscribeToMemberChanges(convId, handleMember);
		const typeChannel = typingChannel(convId, (userId, typing) => {
			if (userId === uid) return;
			if (typing) {
				typingUsers[userId] = 'typing';
				clearTimeout(typingTimers[userId]);
				typingTimers[userId] = setTimeout(() => {
					delete typingUsers[userId];
				}, 3500);
			} else {
				delete typingUsers[userId];
			}
		});
		typeChannelState = typeChannel;
		const presence = presenceChannel(convId, {
			userId: uid,
			onPresence: (others) => {
				for (const id in onlineUsers) delete onlineUsers[id];
				for (const o of others) onlineUsers[o.user_id] = true;
			}
		});

		return () => {
			for (const uid of Object.keys(typingUsers)) delete typingUsers[uid];
			for (const uid of Object.keys(onlineUsers)) delete onlineUsers[uid];
			client.removeChannel(msgChannel);
			client.removeChannel(reactChannel);
			client.removeChannel(memberChannel);
			client.removeChannel(typeChannel);
			client.removeChannel(presence);
		};
	});

	// ---- scroll to bottom when messages arrive ----
	$effect(() => {
		const msgs = chat.messages;
		if (msgs.length > 0 && stick) {
			queueMicrotask(() => scrollToBottom());
		}
	});

	async function handlePayload(payload: ChangesPayload) {
		const client = getSupabase();
		if (payload.eventType === 'INSERT') {
			const msg = await getMessageById(client, payload.new.id as number);
			if (msg) applyMessage(msg);
		} else if (payload.eventType === 'UPDATE') {
			const n = payload.new;
			applyMessageUpdate(n.id as number, {
				content: n.content as string,
				deleted_at: n.deleted_at as string | null,
				edited_at: n.edited_at as string | null,
				file_url: n.file_url as string | null,
				file_name: n.file_name as string | null,
				type: n.type as MessageWithSender['type']
			});
		} else if (payload.eventType === 'DELETE') {
			removeMessage(payload.old.id as number);
		}
	}

	async function handleReaction(payload: ChangesPayload) {
		const mid = (payload.new?.message_id ?? payload.old?.message_id) as number | undefined;
		if (!mid) return;
		const msg = await getMessageById(getSupabase(), mid);
		if (msg && msg.conversation_id === conversationId) updateMessageLocally(msg);
	}

	function handleMember(payload: ChangesPayload) {
		const n = payload.new;
		applyMemberUpdate(conversationId, {
			user_id: n.user_id as string,
			last_read_at: n.last_read_at as string,
			role: n.role as 'owner' | 'admin' | 'member',
			muted: n.muted as boolean
		});
	}

	// ---- details panel state ----
	let showDetails = $state(false);
	let editName = $state('');
	let editDesc = $state('');
	let editingGroupDetails = $state(false);
	let savingGroupDetails = $state(false);
	let saveError = $state('');

	// members and friends state for adding members
	let friends = $state<FriendWithProfile[]>([]);
	let loadingFriends = $state(false);
	let showAddMember = $state(false);

	$effect(() => {
		if (conversation) {
			editName = conversation.name ?? '';
			editDesc = conversation.description ?? '';
			// Reset add member and edit states when switching chats
			showAddMember = false;
			editingGroupDetails = false;
			saveError = '';
		}
	});

	const sharedMedia = $derived(
		chat.messages.filter((m) => !m.deleted_at && ['image', 'video', 'file'].includes(m.type))
	);

	const addableFriends = $derived(
		friends.filter((f) => !conversation?.participants.some((p) => p.user_id === f.id))
	);

	async function toggleMuted() {
		if (!conversation || !auth.user) return;
		const client = getSupabase();
		const newMuted = !conversation.my_member.muted;
		applyMemberUpdate(conversationId, { user_id: auth.user.id, muted: newMuted });
		const { error } = await updateMember(client, conversationId, auth.user.id, { muted: newMuted });
		if (error) {
			applyMemberUpdate(conversationId, { user_id: auth.user.id, muted: !newMuted });
		}
	}

	async function saveGroupDetails() {
		if (!conversation || !editName.trim()) return;
		savingGroupDetails = true;
		saveError = '';
		const client = getSupabase();
		const patch = {
			name: editName.trim(),
			description: editDesc.trim()
		};
		const { error } = await updateConversation(client, conversationId, patch);
		savingGroupDetails = false;
		if (error) {
			saveError = error.message;
		} else {
			updateConversationLocally(conversationId, patch);
			editingGroupDetails = false;
		}
	}

	async function handleBlockUser() {
		if (!conversation || !other || !auth.user) return;
		if (
			!confirm(
				`Are you sure you want to block ${other.profile.display_name}? This will remove them from your friends and prevent further messaging.`
			)
		)
			return;
		const client = getSupabase();
		await blockUser(client, auth.user.id, other.user_id);
		await loadConversations(auth.user.id);
		goto('/chat');
	}

	async function openAddMember() {
		if (!auth.user) return;
		showAddMember = !showAddMember;
		if (showAddMember) {
			loadingFriends = true;
			try {
				friends = await getFriends(getSupabase(), auth.user.id);
			} catch (e) {
				console.error(e);
			} finally {
				loadingFriends = false;
			}
		}
	}

	async function handleAddMember(friendId: string) {
		if (!conversation) return;
		const client = getSupabase();
		const { error } = await addConversationMembers(client, conversationId, [friendId]);
		if (!error) {
			if (auth.user) {
				await loadConversations(auth.user.id);
			}
			showAddMember = false;
		}
	}

	async function handleRemoveMember(memberUserId: string) {
		if (!conversation) return;
		const p = conversation.participants.find((x) => x.user_id === memberUserId);
		if (!p) return;
		if (!confirm(`Are you sure you want to remove ${p.profile.display_name} from the group?`))
			return;
		const client = getSupabase();
		const { error } = await removeConversationMember(client, conversationId, memberUserId);
		if (!error) {
			if (auth.user) {
				await loadConversations(auth.user.id);
			}
		}
	}

	// ---- message actions ----
	async function handleSend(input: {
		content: string;
		type: 'text' | 'image' | 'video' | 'audio' | 'file';
		file?: File | Blob | null;
		parentId?: number | null;
		duration?: number | null;
	}): Promise<boolean> {
		const user = auth.user;
		if (!user || !conversationId) return false;
		const client = getSupabase();
		let fileUrl: string | null = null;
		let fileName: string | null = null;
		let fileSize: number | null = null;
		if (input.file) {
			const file =
				input.file instanceof File
					? input.file
					: new File([input.file], 'voice-note.webm', { type: input.file.type });
			const up = await uploadAttachment(client, user.id, file);
			if (!up) return false;
			fileUrl = up.url;
			fileName = file.name;
			fileSize = file.size;
		}
		const msg = await sendMessage(client, {
			conversationId,
			senderId: user.id,
			content: input.content,
			type: input.type,
			fileUrl,
			fileName,
			fileSize,
			duration: input.duration ?? null,
			parentId: input.parentId ?? null
		});
		if (!msg) return false;
		applyMessage(msg);
		replyTo = null;
		return true;
	}

	async function handleEditText(msg: MessageWithSender, content: string) {
		const { error } = await editMessage(getSupabase(), msg.id, content);
		if (error) return false;
		updateMessageLocally({ ...msg, content, edited_at: new Date().toISOString() });
		editing = null;
		return true;
	}

	async function handleDelete(msg: MessageWithSender) {
		await deleteMessage(getSupabase(), msg.id, false);
	}

	async function handleReact(msg: MessageWithSender, emoji: string) {
		const user = auth.user;
		if (!user || !emoji) return;
		const existing = msg.reactions?.find((r) => r.user_id === user.id && r.emoji === emoji);
		const client = getSupabase();
		if (existing) {
			await removeReaction(client, msg.id, user.id, emoji);
		} else {
			await addReaction(client, msg.id, user.id, emoji);
		}
	}
</script>

<div class="flex h-full flex-col bg-zinc-100 dark:bg-zinc-950">
	{#if conversation}
		<header
			class="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<button
				onclick={toggleSidebar}
				title="Toggle sidebar"
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
			<Avatar
				src={conversation.type === 'group' ? conversation.avatar_url : other?.profile.avatar_url}
				name={title}
				size={38}
				status={!isGroup && otherOnline ? 'online' : undefined}
			/>
			<div class="min-w-0 flex-1">
				<h2 class="truncate leading-tight font-semibold">{title}</h2>
				<p class="truncate text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
			</div>
			<button
				onclick={() => (showDetails = !showDetails)}
				class={cn(
					'flex h-9 w-9 items-center justify-center rounded-full transition',
					showDetails
						? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
						: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
				)}
				title="Conversation details"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
			</button>
		</header>

		<div class="relative flex min-h-0 flex-1 overflow-hidden">
			<!-- Main Chat Pane -->
			<div class="flex min-w-0 flex-1 flex-col">
				<div bind:this={messagesEl} onscroll={onScroll} class="flex-1 overflow-y-auto px-3 sm:px-6">
					<div class="mx-auto max-w-3xl space-y-1 py-4">
						{#if chat.messages.length === 0 && chat.loadingMessages}
							<div class="flex justify-center py-16">
								<div
									class="h-7 w-7 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600 dark:border-zinc-700"
								></div>
							</div>
						{:else}
							{#each chat.messages as msg, i (msg.id)}
								{#if i === 0 || !isSameDay(chat.messages[i - 1].created_at, msg.created_at)}
									<div class="flex justify-center py-2">
										<span
											class="rounded-full bg-zinc-200/70 px-3 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
										>
											{dayLabel(msg.created_at)}
										</span>
									</div>
								{/if}
								<MessageBubble
									{msg}
									isOwn={msg.sender_id === auth.user?.id}
									{isGroup}
									showHeader={needsHeader(i)}
									{other}
									bind:lightboxUrl
									onReply={(m) => {
										replyTo = m;
										editing = null;
									}}
									onEdit={(m) => {
										editing = m;
										replyTo = null;
									}}
									onDelete={handleDelete}
									onReact={handleReact}
								/>
							{/each}

							{#if typingNames.length > 0}
								<div
									class="flex items-center gap-2 px-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400"
								>
									<TypingIndicator />
									<span
										>{typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing</span
									>
								</div>
							{/if}
						{/if}
					</div>
				</div>

				<MessageComposer
					typingChannel={typeChannelState}
					bind:replyTo
					bind:editing
					onSend={handleSend}
					onEditText={handleEditText}
					onCancelEdit={() => {
						editing = null;
					}}
				/>
			</div>

			<!-- Details Right Pane -->
			{#if showDetails}
				<div
					class="absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l border-zinc-200 bg-white shadow-2xl sm:static sm:z-0 sm:w-80 sm:shadow-none dark:border-zinc-800 dark:bg-zinc-900"
				>
					<div
						class="flex items-center justify-between border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800"
					>
						<span class="text-sm font-bold">Details</span>
						<button
							onclick={() => (showDetails = false)}
							class="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
							aria-label="Close details"
						>
							<svg
								class="h-5 w-5 text-zinc-500 dark:text-zinc-400"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					</div>

					<div class="flex-1 space-y-6 overflow-y-auto p-4">
						<!-- Avatar & Name / Description info -->
						<div class="flex flex-col items-center text-center">
							<Avatar
								src={conversation.type === 'group'
									? conversation.avatar_url
									: other?.profile.avatar_url}
								name={title}
								size={72}
								status={!isGroup && otherOnline ? 'online' : undefined}
							/>
							{#if isGroup && editingGroupDetails}
								<div class="mt-3 w-full space-y-2">
									<input
										bind:value={editName}
										placeholder="Group name"
										maxlength="60"
										class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
									/>
									<textarea
										bind:value={editDesc}
										placeholder="Add description"
										maxlength="300"
										rows="2"
										class="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
									></textarea>
									{#if saveError}
										<p class="text-xs text-red-500">{saveError}</p>
									{/if}
									<div class="flex justify-end gap-1.5 pt-1">
										<button
											onclick={() => {
												editingGroupDetails = false;
												editName = conversation.name ?? '';
												editDesc = conversation.description ?? '';
											}}
											class="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
											>Cancel</button
										>
										<button
											onclick={saveGroupDetails}
											disabled={savingGroupDetails || !editName.trim()}
											class="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
											>{savingGroupDetails ? 'Saving…' : 'Save'}</button
										>
									</div>
								</div>
							{:else}
								<h3 class="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-50">
									{title}
								</h3>
								<p class="text-xs text-zinc-400">
									{isGroup ? 'Group Conversation' : `@${other?.profile.username}`}
								</p>
								{#if isGroup}
									<p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
										{conversation.description || 'No group description yet.'}
									</p>
									<button
										onclick={() => (editingGroupDetails = true)}
										class="mt-3 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
									>
										Edit details
									</button>
								{:else if other?.profile.bio}
									<p class="mt-2 text-xs text-zinc-500 italic dark:text-zinc-400">
										"{other.profile.bio}"
									</p>
								{/if}
							{/if}
						</div>

						<hr class="border-zinc-100 dark:border-zinc-800" />

						<!-- Settings section -->
						<div>
							<h4
								class="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
							>
								Options
							</h4>
							<div class="mt-2.5 space-y-1.5">
								<button
									onclick={toggleMuted}
									class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
								>
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-zinc-400"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											{#if conversation.my_member.muted}
												<path
													d="M12.003 4.002a.4.4 0 0 0-.4-.4h-.006c-.453.033-.923.111-1.4.24-.761.207-1.464.551-2.053 1.01l7.859 7.859V4.002ZM19.07 19.071 4.929 4.929m1.233 4.31a8.312 8.312 0 0 0-.84 1.258C4.782 11.528 4 12.72 4 14v2a2 2 0 0 0 2 2h10c.51 0 .99-.19 1.35-.5l-1.44-1.44"
												/>
												<path d="m14.9 18-.8 3H9.9l-.8-3" />
											{:else}
												<path
													d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9ZM10.3 21a1.94 1.94 0 0 0 3.4 0"
												/>
											{/if}
										</svg>
										<span>Mute conversation</span>
									</div>
									<span class="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
										{conversation.my_member.muted ? 'Muted' : 'Off'}
									</span>
								</button>
								{#if !isGroup}
									<button
										onclick={handleBlockUser}
										class="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
									>
										<svg
											class="h-4 w-4"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<circle cx="12" cy="12" r="10" />
											<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
										</svg>
										<span>Block user</span>
									</button>
								{/if}
							</div>
						</div>

						<!-- Members Section for Groups -->
						{#if isGroup}
							<hr class="border-zinc-100 dark:border-zinc-800" />
							<div>
								<div class="flex items-center justify-between">
									<h4
										class="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
									>
										Members ({conversation.participants.length})
									</h4>
									<button
										onclick={openAddMember}
										class="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
									>
										{showAddMember ? 'Done' : '+ Add'}
									</button>
								</div>

								{#if showAddMember}
									<div
										class="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"
									>
										<p class="text-[10px] font-bold tracking-wide text-zinc-400 uppercase">
											Add friends to group
										</p>
										{#if loadingFriends}
											<p class="py-3 text-center text-xs text-zinc-400">Loading friends…</p>
										{:else if addableFriends.length === 0}
											<p class="py-3 text-center text-xs text-zinc-400">No more friends to add.</p>
										{:else}
											<div class="mt-1.5 max-h-40 space-y-1.5 overflow-y-auto">
												{#each addableFriends as friend (friend.id)}
													<button
														onclick={() => handleAddMember(friend.id)}
														class="flex w-full items-center gap-2 rounded p-1 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
													>
														<Avatar src={friend.avatar_url} name={friend.display_name} size={24} />
														<span class="flex-1 truncate">{friend.display_name}</span>
														<span class="text-[10px] text-indigo-600">Add</span>
													</button>
												{/each}
											</div>
										{/if}
									</div>
								{/if}

								<div class="mt-3 space-y-2.5">
									{#each conversation.participants as p (p.user_id)}
										<div class="flex items-center gap-2.5">
											<Avatar
												src={p.profile.avatar_url}
												name={p.profile.display_name}
												size={28}
												status={onlineUsers[p.user_id] ? 'online' : undefined}
											/>
											<div class="min-w-0 flex-1">
												<p class="truncate text-xs font-semibold">
													{p.profile.display_name}
												</p>
												<p class="truncate text-[10px] text-zinc-400">@{p.profile.username}</p>
											</div>
											{#if p.role === 'owner'}
												<span
													class="rounded bg-indigo-50 px-1 py-0.5 text-[9px] font-bold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400"
													>Owner</span
												>
											{:else}
												<!-- Kick option if user is owner/admin -->
												{@const myRole = conversation.my_member.role}
												{#if (myRole === 'owner' || myRole === 'admin') && p.user_id !== auth.user?.id}
													<button
														onclick={() => handleRemoveMember(p.user_id)}
														class="text-[10px] font-bold text-zinc-400 hover:text-red-500"
														title="Remove from group"
													>
														Kick
													</button>
												{:else}
													<span class="text-[9px] text-zinc-400 capitalize">{p.role}</span>
												{/if}
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<hr class="border-zinc-100 dark:border-zinc-800" />

						<!-- Shared Media and Files -->
						<div>
							<h4
								class="text-[10px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500"
							>
								Shared Media & Files ({sharedMedia.length})
							</h4>
							{#if sharedMedia.length === 0}
								<p class="mt-2 text-xs text-zinc-400 italic">No media shared yet.</p>
							{:else}
								<div class="mt-2.5 grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
									{#each sharedMedia as media (media.id)}
										{#if media.type === 'image' && media.file_url}
											<button
												onclick={() => (lightboxUrl = media.file_url)}
												class="aspect-square w-full overflow-hidden rounded bg-zinc-100 hover:opacity-80 dark:bg-zinc-800"
											>
												<img
													src={media.file_url}
													alt="Shared thumbnail"
													class="h-full w-full object-cover"
												/>
											</button>
										{:else}
											<a
												href={media.file_url}
												target="_blank"
												rel="noopener noreferrer"
												class="flex aspect-square w-full flex-col items-center justify-center rounded bg-zinc-100 p-1 text-[9px] text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
												title={media.file_name || 'Attachment'}
											>
												<svg
													class="h-5 w-5 stroke-current"
													viewBox="0 0 24 24"
													fill="none"
													stroke-width="2"
													stroke-linecap="round"
													stroke-linejoin="round"
												>
													<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
													<polyline points="14 2 14 8 20 8" />
												</svg>
												<span class="mt-1 w-full truncate px-0.5 text-center"
													>{media.file_name || 'File'}</span
												>
											</a>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-sm text-zinc-400">
			Loading conversation…
		</div>
	{/if}
</div>

{#if lightboxUrl}
	<button
		class="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
		aria-label="Close preview"
		onclick={() => (lightboxUrl = null)}
	>
		<img src={lightboxUrl} alt="Preview" class="max-h-full max-w-full rounded-lg object-contain" />
		<span
			class="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
			>✕</span
		>
	</button>
{/if}
