import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProfileRow } from '#lib/database.types';
import type { FriendStatus, FriendWithProfile } from '#lib/types';

type Client = SupabaseClient<Database>;

export interface FriendRequestWithProfile extends ProfileRow {
	request_id: string;
	request_status: string;
	created_at: string;
}

async function getUserIds(
	client: Client,
	userId: string
): Promise<{ friends: string[]; blocked: string[]; blockedBy: string[] }> {
	const [friendsRes, blockedRes, blockedByRes] = await Promise.all([
		client.from('friends').select('friend_id').eq('user_id', userId),
		client.from('blocked_users').select('blocked_id').eq('user_id', userId),
		client.from('blocked_users').select('user_id').eq('blocked_id', userId)
	]);
	return {
		friends: (friendsRes.data ?? []).map((r) => r.friend_id),
		blocked: (blockedRes.data ?? []).map((r) => r.blocked_id),
		blockedBy: (blockedByRes.data ?? []).map((r) => r.user_id)
	};
}

export async function getFriendStatuses(
	client: Client,
	userId: string,
	profiles: ProfileRow[]
): Promise<Map<string, FriendStatus>> {
	const map = new Map<string, FriendStatus>();
	if (profiles.length === 0) return map;

	const otherIds = profiles.map((p) => p.id);
	const { friends, blocked, blockedBy } = await getUserIds(client, userId);

	const [outgoingRes, incomingRes] = await Promise.all([
		client
			.from('friend_requests')
			.select('recipient_id,status')
			.eq('sender_id', userId)
			.in('recipient_id', otherIds),
		client
			.from('friend_requests')
			.select('sender_id,status')
			.eq('recipient_id', userId)
			.in('sender_id', otherIds)
	]);

	for (const id of otherIds) {
		let status: FriendStatus = 'none';
		if (blocked.includes(id) || blockedBy.includes(id)) status = 'blocked';
		else if (friends.includes(id)) status = 'friends';
		else if (outgoingRes.data?.some((r) => r.recipient_id === id && r.status === 'pending'))
			status = 'pending_out';
		else if (incomingRes.data?.some((r) => r.sender_id === id && r.status === 'pending'))
			status = 'pending_in';
		map.set(id, status);
	}
	return map;
}

export async function getFriends(client: Client, userId: string): Promise<FriendWithProfile[]> {
	const { data } = await client
		.from('friends')
		.select('friend_id, created_at, profile:profiles!friend_id(*)')
		.eq('user_id', userId)
		.order('created_at');
	return (data ?? []).map((r) => ({ ...(r.profile as ProfileRow), added_at: r.created_at }));
}

export async function getFriendRequests(
	client: Client,
	userId: string
): Promise<FriendRequestWithProfile[]> {
	const { data } = await client
		.from('friend_requests')
		.select('id, status, created_at, sender:profiles!sender_id(*)')
		.eq('recipient_id', userId)
		.eq('status', 'pending')
		.order('created_at');
	return (data ?? []).map((r) => ({
		...(r.sender as ProfileRow),
		request_id: r.id,
		request_status: r.status,
		created_at: r.created_at
	}));
}

export async function sendFriendRequest(client: Client, userId: string, recipientId: string) {
	return client.from('friend_requests').insert({ sender_id: userId, recipient_id: recipientId });
}

export async function respondToRequest(client: Client, requestId: string, accept: boolean) {
	if (accept) {
		return client.rpc('accept_friend_request', { p_request_id: requestId });
	}
	return client.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
}

export async function removeFriend(client: Client, userId: string, friendId: string) {
	await client.from('friends').delete().eq('user_id', userId).eq('friend_id', friendId);
	await client.from('friends').delete().eq('user_id', friendId).eq('friend_id', userId);
}

export async function blockUser(client: Client, userId: string, blockedId: string) {
	await removeFriend(client, userId, blockedId);
	await client.from('blocked_users').insert({ user_id: userId, blocked_id: blockedId });
	await client
		.from('friend_requests')
		.delete()
		.or(`sender_id.in.(${userId},${blockedId}),recipient_id.in.(${userId},${blockedId})`);
}

export async function unblockUser(client: Client, userId: string, blockedId: string) {
	return client.from('blocked_users').delete().eq('user_id', userId).eq('blocked_id', blockedId);
}

export async function getBlocked(client: Client, userId: string): Promise<ProfileRow[]> {
	const { data } = await client
		.from('blocked_users')
		.select('blocked:profiles!blocked_id(*)')
		.eq('user_id', userId);
	return (data ?? []).map((r) => r.blocked as ProfileRow);
}

export async function getRelationState(
	client: Client,
	userId: string,
	otherId: string
): Promise<FriendStatus> {
	const { friends, blocked, blockedBy } = await getUserIds(client, userId);
	if (blocked.includes(otherId) || blockedBy.includes(otherId)) return 'blocked';
	if (friends.includes(otherId)) return 'friends';
	const { data } = await client
		.from('friend_requests')
		.select('sender_id,recipient_id,status')
		.or(`sender_id.in.(${userId},${otherId}),recipient_id.in.(${userId},${otherId})`);
	const pending = (data ?? []).filter(
		(r) =>
			r.status === 'pending' &&
			((r.sender_id === userId && r.recipient_id === otherId) ||
				(r.sender_id === otherId && r.recipient_id === userId))
	);
	if (pending.length === 0) return 'none';
	return pending[0].sender_id === userId ? 'pending_out' : 'pending_in';
}
