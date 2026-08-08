<script lang="ts">
	const EMOJIS = [
		'😀',
		'😁',
		'😂',
		'🤣',
		'😅',
		'😊',
		'😍',
		'😘',
		'😎',
		'🤔',
		'🙄',
		'😭',
		'😤',
		'🥺',
		'😳',
		'🤗',
		'🤫',
		'😴',
		'👍',
		'👎',
		'👏',
		'🙌',
		'🤝',
		'💪',
		'❤️',
		'🧡',
		'💛',
		'💚',
		'💙',
		'💜',
		'🔥',
		'✨',
		'🎉',
		'🎊',
		'👀',
		'🙏',
		'💯',
		'⚡',
		'🚀',
		'🌹'
	];

	let { onPick }: { onPick: (emoji: string) => void } = $props();
</script>

<div
	class="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
	role="menu"
>
	<div class="grid grid-cols-8 gap-0.5">
		{#each EMOJIS as emoji (emoji)}
			<button
				onclick={() => onPick(emoji)}
				class="rounded p-1 text-xl transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
