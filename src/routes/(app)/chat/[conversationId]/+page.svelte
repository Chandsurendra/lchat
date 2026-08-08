<script lang="ts">
	import ChatWindow from '#lib/components/chat/ChatWindow.svelte';

	let { data } = $props();
</script>

<ChatWindow conversationId={data.conversationId} />
