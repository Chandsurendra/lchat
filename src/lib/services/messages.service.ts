import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, MessageRow, ProfileRow } from '#lib/database.types';
import type { MessageWithSender } from '#lib/types';

type Client = SupabaseClient<Database>;

type MessageRowWithRelations = MessageRow & {
	sender?: ProfileRow;
	reactions?: Array<{
		id: string;
		message_id: number;
		user_id: string;
		emoji: string;
		created_at: string;
	}>;
};

const BASE_SELECT = '*, sender:profiles!sender_id(*), reactions:message_reactions(*)';

export function hydrate(row: MessageRowWithRelations): MessageWithSender {
	return { ...row, sender: row.sender!, reactions: row.reactions ?? [] };
}

export async function getMessages(
	client: Client,
	conversationId: string,
	opts: { before?: number; limit?: number } = {}
): Promise<MessageWithSender[]> {
	const query = client
		.from('messages')
		.select(BASE_SELECT)
		.eq('conversation_id', conversationId)
		.order('id', { ascending: false })
		.limit(opts.limit ?? 40);
	if (opts.before) query.lt('id', opts.before);
	const { data } = await query;
	return (data ?? []).map(hydrate).reverse();
}

export async function getMessageById(
	client: Client,
	id: number
): Promise<MessageWithSender | null> {
	const { data } = await client.from('messages').select(BASE_SELECT).eq('id', id).single();
	return data ? hydrate(data as MessageRowWithRelations) : null;
}

export async function sendMessage(
	client: Client,
	payload: {
		conversationId: string;
		senderId: string;
		content?: string;
		type?: MessageRow['type'];
		fileUrl?: string | null;
		fileName?: string | null;
		fileSize?: number | null;
		duration?: number | null;
		parentId?: number | null;
	}
): Promise<MessageWithSender | null> {
	const { data, error } = await client
		.from('messages')
		.insert({
			conversation_id: payload.conversationId,
			sender_id: payload.senderId,
			content: payload.content ?? '',
			type: payload.type ?? 'text',
			file_url: payload.fileUrl ?? null,
			file_name: payload.fileName ?? null,
			file_size: payload.fileSize ?? null,
			duration: payload.duration ?? null,
			parent_id: payload.parentId ?? null
		})
		.select(BASE_SELECT)
		.single();
	if (error || !data) return null;
	return hydrate(data as MessageRowWithRelations);
}

export async function editMessage(client: Client, messageId: number, content: string) {
	return client
		.from('messages')
		.update({ content, edited_at: new Date().toISOString() })
		.eq('id', messageId);
}

export async function deleteMessage(client: Client, messageId: number, hard: boolean) {
	if (hard) return client.from('messages').delete().eq('id', messageId);
	return client
		.from('messages')
		.update({ deleted_at: new Date().toISOString(), content: '' })
		.eq('id', messageId);
}

export async function markRead(
	client: Client,
	conversationId: string,
	messageId: number,
	userId: string
) {
	const now = new Date().toISOString();
	await client
		.from('message_reads')
		.upsert({ message_id: messageId, user_id: userId, read_at: now });
	await client
		.from('conversation_members')
		.update({ last_read_at: now })
		.eq('conversation_id', conversationId)
		.eq('user_id', userId);
}

export async function getReadCounts(
	client: Client,
	messageIds: number[]
): Promise<Map<number, number>> {
	if (messageIds.length === 0) return new Map();
	const { data } = await client
		.from('message_reads')
		.select('message_id')
		.in('message_id', messageIds);
	const map = new Map<number, number>();
	for (const r of data ?? []) map.set(r.message_id, (map.get(r.message_id) ?? 0) + 1);
	return map;
}

export async function addReaction(
	client: Client,
	messageId: number,
	userId: string,
	emoji: string
) {
	return client.from('message_reactions').upsert({ message_id: messageId, user_id: userId, emoji });
}

export async function removeReaction(
	client: Client,
	messageId: number,
	userId: string,
	emoji: string
) {
	return client
		.from('message_reactions')
		.delete()
		.eq('message_id', messageId)
		.eq('user_id', userId)
		.eq('emoji', emoji);
}
