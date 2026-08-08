import type {
	ConversationMemberRow,
	ConversationRow,
	MessageReactionRow,
	MessageRow,
	ProfileRow
} from '#lib/database.types';

export interface Conversation extends ConversationRow {
	participants: Participant[];
	my_member: ConversationMemberRow;
	last_message: MessageWithSender | null;
	unread_count: number;
	typing: string[];
}

export interface Participant {
	user_id: string;
	role: ConversationMemberRow['role'];
	muted: boolean;
	profile: ProfileRow;
	last_read_at: string;
}

export interface MessageWithSender extends MessageRow {
	sender: ProfileRow;
	reactions: MessageReactionRow[];
}

export type FriendStatus = 'none' | 'pending_out' | 'pending_in' | 'friends' | 'blocked';

export interface UserSearchResult extends ProfileRow {
	friend_status: FriendStatus;
}

export interface FriendWithProfile extends ProfileRow {
	added_at: string;
}

export type MessageDraft = {
	conversationId: string;
	content: string;
	type: MessageRow['type'];
	file?: File;
	parentId?: number | null;
};
