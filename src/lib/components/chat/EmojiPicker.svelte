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

	let {
		onPick,
		onClose
	}: {
		onPick: (emoji: string) => void;
		onClose?: () => void;
	} = $props();

	let containerEl = $state<HTMLDivElement>();

	$effect(() => {
		if (!onClose) return;

		const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
			if (containerEl && !containerEl.contains(event.target as Node)) {
				onClose();
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('click', handleOutsideClick);
		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('click', handleOutsideClick);
			document.removeEventListener('keydown', handleKeyDown);
		};
	});
</script>

<div
	bind:this={containerEl}
	class="absolute bottom-full left-0 z-40 mb-2 w-64 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
	role="menu"
>
	<div class="grid grid-cols-8 gap-0.5">
		{#each EMOJIS as emoji (emoji)}
			<button
				onclick={() => onPick(emoji)}
				class="rounded p-1 text-xl transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
				aria-label="Insert {emoji} emoji"
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
