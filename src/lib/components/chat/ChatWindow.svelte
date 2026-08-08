<script lang="ts">
	import { untrack } from 'svelte';
	import { auth } from '#lib/stores/auth.svelte';
	import {
		chat,
		openConversation,
		applyMessage,
		updateMessageLocally,
		markReadNow,
		loadMore
	} from '#lib/stores/conversations.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import { typingChannel, presenceChannel } from '#lib/services/realtime.service';
	import {
		sendMessage,
		editMessage,
		deleteMessage,
		addReaction,
		removeReaction
	} from '#lib/services/messages.service';
	import { uploadAttachment } from '#lib/services/storage.service';
	import { conversationTitle, getOtherParticipant } from '#lib/services/conversations.service';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import MessageBubble from './MessageBubble.svelte';
	import MessageComposer from './MessageComposer.svelte';
	import TypingIndicator from './TypingIndicator.svelte';
	import { isSameDay, dayLabel, timeAgo } from '#lib/utils/time';
	import type { MessageWithSender } from '#lib/types';

	let { conversationId }: { conversationId: string } = $props();

	const conversation = $derived(chat.conversations.find((c) => c.id === conversationId) ?? null);
	const isGroup = $derived(conversation?.type === 'group');
	const other = $derived(getOtherParticipant(conversation!, auth.user?.id ?? ''));
	const title = $derived(conversationTitle(conversation!, auth.user?.id ?? ''));

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
			{#if isGroup}
				<a
					href="/settings"
					class="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
					title="Group info"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle
							cx="5"
							cy="12"
							r="1"
						/></svg
					>
				</a>
			{/if}
		</header>

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
						<div class="flex items-center gap-2 px-1 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
							<TypingIndicator />
							<span>{typingNames.join(', ')} {typingNames.length > 1 ? 'are' : 'is'} typing</span>
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
