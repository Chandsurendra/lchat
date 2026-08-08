import type { Conversation, MessageWithSender } from '#lib/types';
import type { ConversationMemberRow } from '#lib/database.types';
import { getSupabase } from '#lib/services/supabase';
import {
	getConversations,
	getOrCreateDirectConversation,
	createGroupConversation as createGroup
} from '#lib/services/conversations.service';
import {
	getMessages as fetchMessages,
	getMessageById,
	markRead
} from '#lib/services/messages.service';
import {
	subscribeToAllMessages,
	subscribeToReactionChanges,
	subscribeToAllMemberChanges,
	subscribeToAllConversations
} from '#lib/services/realtime.service';

const PAGE_SIZE = 40;

export const chat = $state({
	conversations: [] as Conversation[],
	activeConversationId: null as string | null,
	activeUserId: null as string | null,
	messages: [] as MessageWithSender[],
	loadingConversations: true,
	loadingMessages: false,
	hasMore: true,
	error: null as string | null
});

export async function loadConversations(userId: string) {
	chat.loadingConversations = true;
	chat.error = null;
	try {
		chat.conversations = await getConversations(getSupabase(), userId);
	} catch (e) {
		chat.error = e instanceof Error ? e.message : 'Failed to load conversations';
	}
	chat.loadingConversations = false;
}

export async function openConversation(conversationId: string) {
	if (chat.activeConversationId === conversationId && chat.messages.length > 0) return;
	if (chat.activeConversationId === conversationId && chat.loadingMessages) return;
	chat.activeConversationId = conversationId;
	chat.messages = [];
	chat.hasMore = true;
	const conv = chat.conversations.find((c) => c.id === conversationId);
	if (conv) conv.unread_count = 0;
	await loadMore();
}

export async function loadMore() {
	const convId = chat.activeConversationId;
	if (!convId || !chat.hasMore || chat.loadingMessages) return;
	chat.loadingMessages = true;
	try {
		const before = chat.messages[0]?.id;
		const msgs = await fetchMessages(getSupabase(), convId, { before, limit: PAGE_SIZE });
		chat.messages = mergeMessages(msgs, chat.messages);
		chat.hasMore = msgs.length === PAGE_SIZE;
	} finally {
		chat.loadingMessages = false;
	}
}

export function mergeMessages(
	existing: MessageWithSender[],
	next: MessageWithSender[]
): MessageWithSender[] {
	const byId: Record<number, MessageWithSender> = {};
	for (const m of next) byId[m.id] = m;
	for (const m of existing) byId[m.id] = m;
	return Object.values(byId).sort((a, b) => a.id - b.id);
}

export function applyMessage(msg: MessageWithSender) {
	const conv = chat.conversations.find((c) => c.id === msg.conversation_id);
	if (conv) {
		conv.last_message = msg;
		conv.updated_at = msg.created_at;
		conv.unread_count =
			chat.activeConversationId === msg.conversation_id ? 0 : conv.unread_count + 1;
		chat.conversations = sortConversations(chat.conversations);
	}
	if (chat.activeConversationId === msg.conversation_id) {
		chat.messages = mergeMessages(chat.messages, [msg]);
		if (chat.messages[0]?.id === msg.id) chat.hasMore = true;
		markReadNow(msg.conversation_id, msg.id);
	}
}

export function updateMessageLocally(msg: MessageWithSender) {
	if (chat.activeConversationId === msg.conversation_id) {
		chat.messages = chat.messages.map((m) => (m.id === msg.id ? msg : m));
	}
	const conv = chat.conversations.find((c) => c.id === msg.conversation_id);
	if (conv && conv.last_message?.id === msg.id) conv.last_message = msg;
}

export function applyMessageUpdate(id: number, fields: Partial<MessageWithSender>) {
	const convId = chat.activeConversationId;
	if (!convId) return;
	chat.messages = chat.messages.map((m) =>
		m.id === id ? ({ ...m, ...fields, reactions: m.reactions } as MessageWithSender) : m
	);
	const conv = chat.conversations.find((c) => c.id === convId);
	if (conv?.last_message?.id === id) conv.last_message = { ...conv.last_message, ...fields };
}

export function removeMessage(id: number) {
	chat.messages = chat.messages.filter((m) => m.id !== id);
	const conv = chat.conversations.find((c) => c.id === chat.activeConversationId);
	if (conv?.last_message?.id === id) conv.last_message = null;
}

export function applyMemberUpdate(conversationId: string, fields: Partial<ConversationMemberRow>) {
	const conv = chat.conversations.find((c) => c.id === conversationId);
	if (!conv) return;
	const idx = conv.participants.findIndex((p) => p.user_id === fields.user_id);
	if (idx >= 0) {
		if (fields.last_read_at) conv.participants[idx].last_read_at = fields.last_read_at;
		if (fields.role) conv.participants[idx].role = fields.role;
		if (fields.muted !== undefined) conv.participants[idx].muted = fields.muted;
	}
	if (fields.user_id === chat.activeUserId && fields.last_read_at) {
		conv.my_member.last_read_at = fields.last_read_at;
	}
}

export function applyConversationUpdate(id: string, fields: Partial<Conversation>) {
	const conv = chat.conversations.find((c) => c.id === id);
	if (conv) {
		if (fields.name !== undefined) conv.name = fields.name;
		if (fields.avatar_url !== undefined) conv.avatar_url = fields.avatar_url;
		if (fields.description !== undefined) conv.description = fields.description;
		if (fields.updated_at !== undefined) conv.updated_at = fields.updated_at;
	}
}

function sortConversations(list: Conversation[]): Conversation[] {
	return [...list].sort(
		(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
	);
}

export async function markReadNow(conversationId: string, messageId: number) {
	const {
		data: { user }
	} = await getSupabase().auth.getUser();
	if (!user) return;
	const conv = chat.conversations.find((c) => c.id === conversationId);
	if (conv) {
		conv.unread_count = 0;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		conv.my_member.last_read_at = new Date().toISOString();
	}
	markRead(getSupabase(), conversationId, messageId, user.id);
}

export async function openOrCreateDirect(otherId: string): Promise<string | null> {
	const id = await getOrCreateDirectConversation(getSupabase(), otherId);
	if (!id) return null;
	const {
		data: { user }
	} = await getSupabase().auth.getUser();
	if (!user) return null;
	await loadConversations(user.id);
	return id;
}

export async function createGroupConversation(input: {
	name: string;
	description?: string;
	memberIds: string[];
}) {
	const {
		data: { user }
	} = await getSupabase().auth.getUser();
	if (!user) return null;
	const { id } = await createGroup(getSupabase(), user.id, input);
	if (id) await loadConversations(user.id);
	return id;
}

export function clearActiveConversation() {
	chat.activeConversationId = null;
	chat.messages = [];
}

let globalChannels: Array<import('@supabase/supabase-js').RealtimeChannel> = [];

export function initRealtime(userId: string) {
	cleanupRealtime();

	const client = getSupabase();

	const msgChannel = subscribeToAllMessages(async (payload) => {
		if (payload.eventType === 'INSERT') {
			const msg = await getMessageById(client, payload.new.id as number);
			if (msg) applyMessage(msg);
		} else if (payload.eventType === 'UPDATE') {
			const n = payload.new;
			applyMessageUpdate(n.id as number, {
				content: n.content as string,
				deleted_at: n.deleted_at as string | null,
				edited_at: n.edited_at as string | null,
				file_url: n.file_url as string | null,
				file_name: n.file_name as string | null,
				type: n.type as MessageWithSender['type']
			});
		} else if (payload.eventType === 'DELETE') {
			removeMessage(payload.old.id as number);
		}
	});

	const reactChannel = subscribeToReactionChanges(async (payload) => {
		const mid = (payload.new?.message_id ?? payload.old?.message_id) as number | undefined;
		if (!mid) return;
		const msg = await getMessageById(client, mid);
		if (msg) updateMessageLocally(msg);
	});

	const memberChannel = subscribeToAllMemberChanges(async (payload) => {
		if (payload.eventType === 'INSERT') {
			const n = payload.new;
			if (n.user_id === userId) {
				await loadConversations(userId);
			}
		} else if (payload.eventType === 'UPDATE') {
			const n = payload.new;
			applyMemberUpdate(n.conversation_id as string, {
				user_id: n.user_id as string,
				last_read_at: n.last_read_at as string,
				role: n.role as 'owner' | 'admin' | 'member',
				muted: n.muted as boolean
			});
		}
	});

	const convChannel = subscribeToAllConversations((payload) => {
		if (payload.eventType === 'UPDATE') {
			const n = payload.new;
			applyConversationUpdate(n.id as string, {
				name: n.name as string | null,
				avatar_url: n.avatar_url as string | null,
				description: n.description as string | null,
				updated_at: n.updated_at as string
			});
		}
	});

	globalChannels = [msgChannel, reactChannel, memberChannel, convChannel];

	return cleanupRealtime;
}

export function cleanupRealtime() {
	if (globalChannels.length > 0) {
		const client = getSupabase();
		for (const ch of globalChannels) {
			client.removeChannel(ch);
		}
		globalChannels = [];
	}
}
