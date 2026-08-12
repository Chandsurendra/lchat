<script lang="ts">
	import type { MessageWithSender, Participant } from '#lib/types';
	import { messagesById } from '#lib/stores/conversations.svelte';
	import { auth } from '#lib/stores/auth.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import AttachmentPreview from './AttachmentPreview.svelte';
	import EmojiPicker from './EmojiPicker.svelte';
	import { cn } from '#lib/utils/cn';
	import { formatTime } from '#lib/utils/time';

	let {
		msg,
		isOwn,
		isGroup = false,
		showHeader = false,
		other = null,
		lightboxUrl = $bindable(null),
		onReply,
		onEdit,
		onDelete,
		onReact
	}: {
		msg: MessageWithSender;
		isOwn: boolean;
		isGroup?: boolean;
		showHeader?: boolean;
		other?: Participant | null;
		lightboxUrl?: string | null;
		onReply: (msg: MessageWithSender) => void;
		onEdit: (msg: MessageWithSender) => void;
		onDelete: (msg: MessageWithSender) => void;
		onReact: (msg: MessageWithSender, emoji: string) => void;
	} = $props();

	let showPicker = $state(false);

	// Performance Optimization: use O(1) messagesById lookup instead of O(N) array search
	const replyMsg = $derived(msg.parent_id ? messagesById[msg.parent_id] : null);
	const isDeleted = $derived(msg.deleted_at !== null);
	const seen = $derived(isOwn && !isGroup && !!other && msg.created_at <= other.last_read_at);

	function linkify(text: string): Array<{ text: string; url?: string }> {
		const urlRe = /(https?:\/\/[^\s<]+)/;
		const parts = text.split(urlRe);
		return parts.map((part) => (urlRe.test(part) ? { text: part, url: part } : { text: part }));
	}

	const groupedReactions = $derived.by(() => {
		const groups: Record<string, string[]> = {};
		for (const r of msg.reactions ?? []) {
			groups[r.emoji] = [...(groups[r.emoji] ?? []), r.user_id];
		}
		return Object.entries(groups).map(([emoji, users]) => ({
			emoji,
			count: users.length,
			byMe: users.includes(auth.user?.id ?? '')
		}));
	});
</script>

<div class={cn('group flex w-full items-end gap-2', isOwn ? 'flex-row-reverse' : '')}>
	{#if !isOwn && showHeader}
		<Avatar src={msg.sender.avatar_url} name={msg.sender.display_name} size={28} class="mb-1" />
	{:else}
		<div class="w-7"></div>
	{/if}

	<div class={cn('relative flex max-w-[75%] flex-col', isOwn ? 'items-end' : 'items-start')}>
		{#if showHeader && !isOwn}
			<span class="mb-0.5 px-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
				{msg.sender.display_name}
			</span>
		{/if}

		<div
			class={cn(
				'rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm',
				isOwn
					? 'rounded-br-md bg-indigo-600 text-white'
					: 'rounded-bl-md bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
				isDeleted && 'italic opacity-60'
			)}
		>
			{#if replyMsg}
				<div
					class={cn(
						'mb-1.5 rounded-lg px-2 py-1 text-xs',
						isOwn ? 'bg-white/15' : 'bg-zinc-100 dark:bg-zinc-700/60'
					)}
				>
					<span class="font-medium">{replyMsg.sender.display_name}</span>
					<span class="opacity-80">: {replyMsg.content || '📎 attachment'}</span>
				</div>
			{/if}

			{#if !isDeleted}
				<AttachmentPreview {msg} bind:lightboxUrl />
				{#if msg.content}
					<div class={cn(msg.type !== 'text' && 'mt-1.5')}>
						{#each linkify(msg.content) as part, i (i)}
							{#if part.url}
								<a
									href={part.url}
									target="_blank"
									rel="noreferrer"
									class="underline decoration-current/40 underline-offset-2">{part.text}</a
								>
							{:else}
								{part.text}
							{/if}
						{/each}
					</div>
				{/if}
			{:else}
				This message was deleted
			{/if}
		</div>

		{#if !isDeleted && groupedReactions.length > 0}
			<div class={cn('mt-1 flex flex-wrap gap-1', isOwn && 'justify-end')}>
				{#each groupedReactions as r (r.emoji)}
					<button
						onclick={() => onReact(msg, r.emoji)}
						class={cn(
							'rounded-full border px-2 py-0.5 text-xs transition',
							r.byMe
								? 'border-indigo-300 bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950'
								: 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
						)}
					>
						{r.emoji}
						{r.count}
					</button>
				{/each}
			</div>
		{/if}

		<div class={cn('mt-0.5 px-1 text-[10px] text-zinc-400', isOwn && 'flex items-center gap-1')}>
			<span>
				{formatTime(msg.created_at)}
				{#if msg.edited_at}<span class="ml-1 opacity-70">· edited</span>{/if}
			</span>
			{#if isOwn && seen && !isGroup}
				<span class="font-medium text-sky-500">✓✓</span>
			{/if}
		</div>
	</div>

	{#if !isDeleted}
		<div
			class={cn(
				'absolute z-20 flex items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-0.5 opacity-0 shadow-md transition group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-800',
				isOwn ? 'right-0 -translate-y-8' : 'left-0 -translate-y-8'
			)}
		>
			<div class="relative">
				<button
					onclick={() => (showPicker = !showPicker)}
					class="flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
					title="React">😊</button
				>
				{#if showPicker}
					<EmojiPicker
						onPick={(e) => {
							onReact(msg, e);
							showPicker = false;
						}}
					/>
				{/if}
			</div>
			<button
				onclick={() => onReply(msg)}
				class="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
				title="Reply"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M9 17l-5-5 5-5M4 12h11a6 6 0 0 1 6 6v1" /></svg
				>
			</button>
			{#if isOwn}
				<button
					onclick={() => onEdit(msg)}
					class="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
					title="Edit"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg
					>
				</button>
				<button
					onclick={() => onDelete(msg)}
					class="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
					title="Delete"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
						/></svg
					>
				</button>
			{/if}
		</div>
	{/if}
</div>
