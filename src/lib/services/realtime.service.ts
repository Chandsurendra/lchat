import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '#lib/services/supabase';

export type ChangesPayload = {
	new: Record<string, unknown>;
	old: Record<string, unknown>;
	eventType: string;
};

type PostgresListener = (payload: ChangesPayload) => void;

export function subscribeToConversationChanges(
	conversationId: string,
	cb: PostgresListener
): RealtimeChannel {
	return getSupabase()
		.channel(`postgres:conversation:${conversationId}`)
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'messages',
				filter: `conversation_id=eq.${conversationId}`
			},
			(payload) => cb(payload as unknown as ChangesPayload)
		)
		.subscribe();
}

export function subscribeToReactionChanges(cb: PostgresListener): RealtimeChannel {
	return getSupabase()
		.channel('postgres:reactions')
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'message_reactions' },
			(payload) => cb(payload as unknown as ChangesPayload)
		)
		.subscribe();
}

export function subscribeToMemberChanges(
	conversationId: string,
	cb: PostgresListener
): RealtimeChannel {
	return getSupabase()
		.channel(`postgres:members:${conversationId}`)
		.on(
			'postgres_changes',
			{
				event: 'UPDATE',
				schema: 'public',
				table: 'conversation_members',
				filter: `conversation_id=eq.${conversationId}`
			},
			(payload) => cb(payload as unknown as ChangesPayload)
		)
		.subscribe();
}

export function typingChannel(
	conversationId: string,
	onTyping: (userId: string, typing: boolean) => void
): RealtimeChannel {
	return getSupabase()
		.channel(`typing:${conversationId}`)
		.on(
			'broadcast',
			{ event: 'typing' },
			({ payload }: { payload: { user_id: string; typing: boolean } }) =>
				onTyping(payload.user_id, payload.typing)
		)
		.subscribe();
}

export function sendTyping(channel: RealtimeChannel | null, userId: string, typing: boolean) {
	channel?.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, typing } });
}

export interface PresenceState {
	user_id: string;
	status: 'online' | 'offline' | 'away';
}

export function presenceChannel(
	conversationId: string,
	opts: {
		userId: string;
		onPresence: (others: PresenceState[]) => void;
	}
): RealtimeChannel {
	let ch: RealtimeChannel | null = null;
	ch = getSupabase()
		.channel(`presence:${conversationId}`, { config: { presence: { key: opts.userId } } })
		.on('presence', { event: 'sync' }, () => {
			const state = ch?.presenceState() ?? {};
			const others = Object.entries(state)
				.filter(([id]) => id !== opts.userId)
				.map(([id, list]) => {
					const first = list[0] as Partial<PresenceState> | undefined;
					return {
						user_id: id,
						status: first?.status === 'away' ? 'away' : 'online'
					} as PresenceState;
				});
			opts.onPresence(others);
		})
		.subscribe(async (status) => {
			if (status === 'SUBSCRIBED') {
				await ch?.track({ user_id: opts.userId, status: 'online' });
			}
		});
	return ch;
}

export function setPresenceStatus(
	channel: RealtimeChannel | null,
	status: PresenceState['status']
) {
	channel?.track({ status });
}
