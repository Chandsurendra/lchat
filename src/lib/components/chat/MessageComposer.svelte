<script lang="ts">
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import type { MessageWithSender } from '#lib/types';
	import { auth } from '#lib/stores/auth.svelte';
	import { sendTyping } from '#lib/services/realtime.service';
	import EmojiPicker from './EmojiPicker.svelte';
	import { cn } from '#lib/utils/cn';
	import { formatBytes } from '#lib/utils/time';
	import { VOICE_NOTE_MAX_SECONDS } from '#lib/utils/constants';

	type Outgoing = {
		content: string;
		type: 'text' | 'image' | 'video' | 'audio' | 'file';
		file?: File | Blob | null;
		parentId?: number | null;
		duration?: number | null;
	};

	let {
		typingChannel = null,
		replyTo = $bindable(null),
		editing = $bindable(null),
		onSend,
		onEditText,
		onCancelEdit
	}: {
		typingChannel?: RealtimeChannel | null;
		replyTo?: MessageWithSender | null;
		editing?: MessageWithSender | null;
		onSend: (input: Outgoing) => Promise<boolean>;
		onEditText: (msg: MessageWithSender, content: string) => Promise<boolean>;
		onCancelEdit: () => void;
	} = $props();

	let text = $state('');
	let attachments = $state<File[]>([]);
	let showEmoji = $state(false);
	let inputEl: HTMLTextAreaElement | undefined = $state();

	// typing indicator
	let typingSentAt = 0;
	let typingStopTimer: ReturnType<typeof setTimeout> | null = null;

	function emitTyping() {
		if (!typingChannel || !auth.user) return;
		const uid = auth.user.id;
		const now = Date.now();
		if (now - typingSentAt > 2500) {
			sendTyping(typingChannel, uid, true);
			typingSentAt = now;
		}
		if (typingStopTimer) clearTimeout(typingStopTimer);
		typingStopTimer = setTimeout(() => sendTyping(typingChannel, uid, false), 2000);
	}

	// voice recording
	let recorder: MediaRecorder | null = null;
	let recStream: MediaStream | null = null;
	let recChunks: Blob[] = [];
	let recording = $state(false);
	let recTime = $state(0);
	let recInterval: ReturnType<typeof setInterval> | null = null;

	async function startRecording() {
		try {
			recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			recorder = new MediaRecorder(recStream);
			recChunks = [];
			recorder.ondataavailable = (e) => recChunks.push(e.data);
			recorder.start();
			recording = true;
			recTime = 0;
			recInterval = setInterval(() => {
				recTime++;
				if (recTime >= VOICE_NOTE_MAX_SECONDS) stopRecording(true);
			}, 1000);
		} catch {
			/* permission denied */
		}
	}

	async function stopRecording(send: boolean) {
		if (!recorder) return;
		recording = false;
		clearInterval(recInterval!);
		const duration = recTime;
		await new Promise<void>((resolve) => {
			recorder!.onstop = () => resolve();
			recorder!.stop();
		});
		recStream?.getTracks().forEach((t) => t.stop());
		recStream = null;
		recorder = null;
		if (send && recChunks.length > 0) {
			const blob = new Blob(recChunks, { type: 'audio/webm' });
			const ok = await onSend({ content: '', type: 'audio', file: blob, duration });
			if (ok) recChunks = [];
		}
		recTime = 0;
	}

	function inferType(file: File): Outgoing['type'] {
		if (file.type.startsWith('image/')) return 'image';
		if (file.type.startsWith('video/')) return 'video';
		if (file.type.startsWith('audio/')) return 'audio';
		return 'file';
	}

	function onFiles(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files) attachments = [...attachments, ...Array.from(input.files)];
		input.value = '';
	}

	function removeAttachment(i: number) {
		attachments = attachments.filter((_, idx) => idx !== i);
	}

	function insertEmoji(emoji: string) {
		text += emoji;
		showEmoji = false;
		inputEl?.focus();
	}

	function autoGrow() {
		if (!inputEl) return;
		inputEl.style.height = 'auto';
		inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
	}

	async function submit() {
		if (editing) {
			const ok = await onEditText(editing, text);
			if (ok) {
				text = '';
				autoGrow();
			}
			return;
		}
		const content = text.trim();
		if (!content && attachments.length === 0) return;

		const parentId = replyTo?.id ?? null;

		if (attachments.length > 0) {
			for (let i = 0; i < attachments.length; i++) {
				const file = attachments[i];
				const caption = i === attachments.length - 1 ? content : '';
				const ok = await onSend({
					content: caption,
					type: inferType(file),
					file,
					parentId
				});
				if (!ok) return;
			}
			attachments = [];
			text = '';
		} else {
			const ok = await onSend({ content, type: 'text', parentId });
			if (ok) text = '';
		}
		autoGrow();
		sendTyping(typingChannel, auth.user?.id ?? '', false);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			submit();
		}
	}
</script>

<div class="border-t border-zinc-200 bg-white px-3 pt-2 pb-3 dark:border-zinc-800 dark:bg-zinc-900">
	{#if editing}
		<div
			class="mb-2 flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2 text-sm dark:bg-indigo-950/50"
		>
			<span class="truncate"><span class="font-medium">Editing:</span> {editing.content}</span>
			<button
				onclick={() => {
					onCancelEdit();
					text = '';
				}}
				aria-label="Cancel editing"
				class="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button
			>
		</div>
	{:else if replyTo}
		<div
			class="mb-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"
		>
			<span class="truncate">
				<span class="font-medium">Replying to {replyTo.sender.display_name}:</span>
				{replyTo.content || '📎 attachment'}
			</span>
			<button
				onclick={() => (replyTo = null)}
				aria-label="Cancel reply"
				class="ml-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">✕</button
			>
		</div>
	{/if}

	{#if attachments.length > 0}
		<div class="mb-2 flex flex-wrap gap-2">
			{#each attachments as file, i (file)}
				<div
					class="relative flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-700"
				>
					<span>{file.type.startsWith('image/') ? '🖼️' : '📎'}</span>
					<span class="max-w-40 truncate">{file.name}</span>
					<span class="text-zinc-400">{formatBytes(file.size)}</span>
					<button
						onclick={() => removeAttachment(i)}
						aria-label={`Remove ${file.name}`}
						class="text-zinc-400 hover:text-red-500">✕</button
					>
				</div>
			{/each}
		</div>
	{/if}

	{#if recording}
		<div
			class="mb-2 flex items-center gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
		>
			<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"></span>
			<span>Recording… {recTime}s</span>
			<button onclick={() => stopRecording(false)} class="ml-auto font-medium hover:underline"
				>Cancel</button
			>
			<button
				onclick={() => stopRecording(true)}
				class="rounded-md bg-red-600 px-3 py-1 font-medium text-white hover:bg-red-500">Send</button
			>
		</div>
	{/if}

	<div class="flex items-end gap-1.5">
		<div class="relative">
			<button
				onclick={() => (showEmoji = !showEmoji)}
				title="Emoji"
				aria-label="Choose emoji"
				aria-expanded={showEmoji}
				class="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
				>😊</button
			>
			{#if showEmoji}
				<EmojiPicker onPick={insertEmoji} />
			{/if}
		</div>

		<label
			class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition focus-within:ring-2 focus-within:ring-indigo-500 focus-within:outline-hidden hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
			title="Attach"
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path
					d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"
				/></svg
			>
			<input type="file" multiple class="sr-only" onchange={onFiles} aria-label="Attach files" />
		</label>

		<textarea
			bind:this={inputEl}
			bind:value={text}
			oninput={emitTyping}
			onkeydown={onKeydown}
			rows="1"
			placeholder={editing ? 'Edit message…' : 'Type a message…'}
			class="max-h-[140px] min-h-[40px] flex-1 resize-none rounded-2xl border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm focus:border-indigo-400 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-800"
		></textarea>

		{#if recording}
			<div></div>
		{:else if text.trim() || attachments.length > 0 || editing}
			<button
				onclick={submit}
				title="Send"
				aria-label="Send message"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg
				>
			</button>
		{:else}
			<button
				onclick={() => (recording ? stopRecording(false) : startRecording())}
				title={recording ? 'Stop' : 'Record voice note'}
				aria-label={recording ? 'Stop voice recording' : 'Record voice note'}
				class={cn(
					'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-hidden',
					recording
						? 'bg-red-600 text-white'
						: 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
				)}
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path
						d="M19 10v2a7 7 0 0 1-14 0v-2"
					/><line x1="12" x2="12" y1="19" y2="22" /></svg
				>
			</button>
		{/if}
	</div>
</div>
