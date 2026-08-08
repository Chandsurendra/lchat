<script lang="ts">
	import type { MessageWithSender } from '#lib/types';
	import { formatBytes } from '#lib/utils/time';

	let {
		msg,
		// eslint-disable-next-line no-useless-assignment
		lightboxUrl = $bindable(null)
	}: {
		msg: MessageWithSender;
		lightboxUrl?: string | null;
	} = $props();
</script>

{#if msg.type === 'image'}
	{#if msg.file_url}
		<button
			onclick={() => (lightboxUrl = msg.file_url!)}
			class="block overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
		>
			<img
				src={msg.file_url}
				alt={msg.file_name ?? 'image'}
				class="max-h-72 w-auto max-w-full object-cover"
				loading="lazy"
			/>
		</button>
	{/if}
{:else if msg.type === 'video'}
	{#if msg.file_url}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video
			src={msg.file_url}
			controls
			playsinline
			preload="metadata"
			class="max-h-72 w-auto max-w-full rounded-xl border border-black/10 dark:border-white/10"
		></video>
	{/if}
{:else if msg.type === 'audio'}
	{#if msg.file_url}
		<audio src={msg.file_url} controls preload="none" class="h-10 w-64 max-w-full"></audio>
	{/if}
{:else if msg.type === 'file'}
	{#if msg.file_url}
		<a
			href={msg.file_url}
			target="_blank"
			rel="noreferrer"
			class="flex max-w-xs items-center gap-3 rounded-xl border border-black/10 bg-white/10 px-3 py-2.5 dark:border-white/10"
		>
			<span
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 text-lg"
				>📎</span
			>
			<span class="min-w-0">
				<span class="block truncate text-sm font-medium">{msg.file_name}</span>
				<span class="text-xs opacity-70">{formatBytes(msg.file_size ?? 0)}</span>
			</span>
		</a>
	{/if}
{/if}
