import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	Database,
	ConversationMemberRow,
	ConversationRow,
	MessageRow,
	ProfileRow
} from '#lib/database.types';
import type { Conversation, Participant } from '#lib/types';

type Client = SupabaseClient<Database>;

type MemberRow = ConversationMemberRow & {
	conversation?: {
		id: string;
		type: 'direct' | 'group';
		name: string | null;
		avatar_url: string | null;
		description: string | null;
		created_by: string | null;
		created_at: string;
		updated_at: string;
	};
	profile?: ProfileRow;
};

export async function getConversations(client: Client, userId: string): Promise<Conversation[]> {
	const { data: members } = await client
		.from('conversation_members')
		.select('*, conversation:conversations(*)')
		.eq('user_id', userId);

	if (!members || members.length === 0) return [];

	const convIds = members.map((m) => m.conversation_id);

	const [allMembersRes, lastMessagesRes, unreadRes] = await Promise.all([
		client
			.from('conversation_members')
			.select('*, profile:profiles(*)')
			.in('conversation_id', convIds),
		client.from('conversation_last_message').select('*').in('conversation_id', convIds),
		client.from('conversation_unread').select('conversation_id, unread_count').eq('user_id', userId)
	]);

	const allMembers = (allMembersRes.data ?? []) as MemberRow[];
	const lastMessages = (lastMessagesRes.data ?? []) as Array<MessageRow & { sender?: ProfileRow }>;
	const unreadMap = new Map((unreadRes.data ?? []).map((u) => [u.conversation_id, u.unread_count]));

	// OPTIMIZATION: Group members by conversation_id to allow O(1) lookups and avoid O(N * M) nested filters.
	const membersByConversation = new Map<string, MemberRow[]>();
	for (const member of allMembers) {
		const convId = member.conversation_id;
		let list = membersByConversation.get(convId);
		if (!list) {
			list = [];
			membersByConversation.set(convId, list);
		}
		list.push(member);
	}

	// OPTIMIZATION: Index last messages by conversation_id to perform O(1) lookups instead of sequential search.
	const lastMessageByConversation = new Map<string, MessageRow & { sender?: ProfileRow }>();
	for (const msg of lastMessages) {
		lastMessageByConversation.set(msg.conversation_id, msg);
	}

	return (
		members
			.map((m) => {
				const conv = m.conversation!;
				const convMembers = membersByConversation.get(conv.id) ?? [];
				const participants: Participant[] = convMembers.map((x) => ({
					user_id: x.user_id,
					role: x.role,
					muted: x.muted,
					last_read_at: x.last_read_at,
					profile: x.profile!
				}));
				const last = lastMessageByConversation.get(conv.id);
				return {
					...conv,
					participants,
					my_member: {
						id: m.id,
						conversation_id: m.conversation_id,
						user_id: m.user_id,
						role: m.role,
						last_read_at: m.last_read_at,
						muted: m.muted,
						created_at: m.created_at
					},
					last_message: last ? { ...last, sender: last.sender!, reactions: [] } : null,
					unread_count: unreadMap.get(conv.id) ?? 0,
					typing: []
				} satisfies Conversation;
			})
			// OPTIMIZATION: Direct string lexicographical comparison of ISO timestamps is faster than creating Date objects.
			// ISO-8601 strings (e.g. "2026-08-07T12:00:00Z") sort correctly using string comparison operator.
			.sort((a, b) => (b.updated_at > a.updated_at ? 1 : b.updated_at < a.updated_at ? -1 : 0))
	);
}

export function getOtherParticipant(
	conversation: Conversation,
	userId: string
): Participant | null {
	return (
		conversation.participants.find((p) => p.user_id !== userId) ??
		conversation.participants[0] ??
		null
	);
}

export function conversationTitle(conversation: Conversation, userId: string): string {
	if (conversation.type === 'group' && conversation.name) return conversation.name;
	const other = getOtherParticipant(conversation, userId);
	return other?.profile.display_name ?? 'Unknown';
}

export function conversationAvatar(conversation: Conversation, userId: string): string | null {
	if (conversation.avatar_url) return conversation.avatar_url;
	const other = getOtherParticipant(conversation, userId);
	return other?.profile.avatar_url ?? null;
}

export async function getOrCreateDirectConversation(
	client: Client,
	otherId: string
): Promise<string | null> {
	const { data, error } = await client.rpc('get_or_create_direct_conversation', {
		p_other: otherId
	});
	if (error) return null;
	return data;
}

export async function createGroupConversation(
	client: Client,
	userId: string,
	input: { name: string; description?: string; memberIds: string[] }
) {
	const { data: conversation, error } = await client
		.from('conversations')
		.insert({ type: 'group', name: input.name, description: input.description, created_by: userId })
		.select('id')
		.single();
	if (error || !conversation) return { id: null as string | null, error };

	const members = [userId, ...input.memberIds];
	const { error: memberError } = await client.from('conversation_members').insert(
		members.map((uid) => ({
			conversation_id: conversation.id,
			user_id: uid,
			role: uid === userId ? 'owner' : 'member'
		}))
	);
	return { id: memberError ? null : conversation.id, error: memberError };
}

export async function addConversationMembers(
	client: Client,
	conversationId: string,
	memberIds: string[]
) {
	return client
		.from('conversation_members')
		.insert(memberIds.map((user_id) => ({ conversation_id: conversationId, user_id })));
}

export async function removeConversationMember(
	client: Client,
	conversationId: string,
	userId: string
) {
	return client
		.from('conversation_members')
		.delete()
		.eq('conversation_id', conversationId)
		.eq('user_id', userId);
}

export async function updateConversation(
	client: Client,
	conversationId: string,
	patch: Partial<ConversationRow>
) {
	return client.from('conversations').update(patch).eq('id', conversationId);
}

export async function updateMember(
	client: Client,
	conversationId: string,
	userId: string,
	patch: Partial<ConversationMemberRow>
) {
	return client
		.from('conversation_members')
		.update(patch)
		.eq('conversation_id', conversationId)
		.eq('user_id', userId);
}
