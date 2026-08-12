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

	const EMOJI_LABELS: Record<string, string> = {
		'😀': 'Grinning face',
		'😁': 'Beaming face with smiling eyes',
		'😂': 'Face with tears of joy',
		'🤣': 'Rolling on the floor laughing',
		'😅': 'Grinning face with sweat',
		'😊': 'Smiling face with smiling eyes',
		'😍': 'Smiling face with heart-eyes',
		'😘': 'Face blowing a kiss',
		'😎': 'Smiling face with sunglasses',
		'🤔': 'Thinking face',
		'🙄': 'Face with rolling eyes',
		'😭': 'Loudly crying face',
		'😤': 'Face with steam from nose',
		'🥺': 'Pleading face',
		'😳': 'Flushed face',
		'🤗': 'Hugging face',
		'🤫': 'Shushing face',
		'😴': 'Sleeping face',
		'👍': 'Thumbs up',
		'👎': 'Thumbs down',
		'👏': 'Clapping hands',
		'🙌': 'Raising hands',
		'🤝': 'Handshake',
		'💪': 'Flexed biceps',
		'❤️': 'Red heart',
		'🧡': 'Orange heart',
		'💛': 'Yellow heart',
		'💚': 'Green heart',
		'💙': 'Blue heart',
		'💜': 'Purple heart',
		'🔥': 'Fire',
		'✨': 'Sparkles',
		'🎉': 'Party popper',
		'🎊': 'Confetti ball',
		'👀': 'Eyes',
		'🙏': 'Folded hands',
		'💯': 'Hundred points',
		'⚡': 'High voltage',
		'🚀': 'Rocket',
		'🌹': 'Rose'
	};

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
				aria-label={EMOJI_LABELS[emoji] || emoji}
				title={EMOJI_LABELS[emoji] || emoji}
				class="rounded p-1 text-xl transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:bg-zinc-800"
			>
				{emoji}
			</button>
		{/each}
	</div>
</div>
