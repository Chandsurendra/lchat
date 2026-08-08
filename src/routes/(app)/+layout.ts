import { browser } from '$app/env';
import type { LayoutLoad } from './$types';
import { auth, initAuth } from '#lib/stores/auth.svelte';
import { chat, loadConversations } from '#lib/stores/conversations.svelte';

export const load: LayoutLoad = async () => {
	if (browser) {
		if (auth.loading) await initAuth();
		if (auth.user && chat.conversations.length === 0) {
			await loadConversations(auth.user.id);
		}
	}
	return {};
};
