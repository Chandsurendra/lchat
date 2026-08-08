<script lang="ts">
	import { cn } from '#lib/utils/cn';

	let {
		src = null,
		name = '',
		size = 40,
		status = null,
		class: klass = ''
	}: {
		src?: string | null;
		name?: string;
		size?: number;
		status?: 'online' | 'offline' | 'away' | null;
		class?: string;
	} = $props();

	const palette = [
		'#6366f1',
		'#ec4899',
		'#14b8a6',
		'#f59e0b',
		'#8b5cf6',
		'#22c55e',
		'#f43f5e',
		'#3b82f6'
	];

	const color = $derived(
		palette[((name.charCodeAt(0) || 0) * 7 + (name.charCodeAt(1) || 0) * 3) % palette.length] ??
			palette[0]
	);

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase())
			.join('') || '?'
	);
</script>

<div class={cn('relative shrink-0', klass)} style={`width:${size}px;height:${size}px`}>
	{#if src}
		<img
			{src}
			alt={name}
			class="h-full w-full rounded-full object-cover"
			style={`width:${size}px;height:${size}px`}
		/>
	{:else}
		<div
			class="flex h-full w-full items-center justify-center rounded-full font-semibold text-white select-none"
			style={`background:${color};font-size:${Math.round(size * 0.42)}px`}
		>
			{initials}
		</div>
	{/if}
	{#if status}
		<span
			class={cn(
				'absolute right-0 bottom-0 block rounded-full ring-2 ring-white dark:ring-zinc-950',
				status === 'online' && 'bg-emerald-500',
				status === 'away' && 'bg-amber-400',
				status === 'offline' && 'bg-zinc-400'
			)}
			style={`width:${Math.max(10, Math.round(size * 0.28))}px;height:${Math.max(10, Math.round(size * 0.28))}px`}
		></span>
	{/if}
</div>
