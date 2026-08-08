import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProfileRow } from '#lib/database.types';

type Client = SupabaseClient<Database>;

export async function getProfile(client: Client, userId: string): Promise<ProfileRow | null> {
	const { data } = await client.from('profiles').select('*').eq('id', userId).single();
	return data;
}

export async function searchProfiles(
	client: Client,
	query: string,
	limit = 12
): Promise<ProfileRow[]> {
	if (!query.trim()) return [];
	const { data } = await client
		.from('profiles')
		.select('*')
		.ilike('username', `%${query.trim()}%`)
		.or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
		.order('username')
		.limit(limit);
	return data ?? [];
}

export async function updateProfile(client: Client, userId: string, patch: Partial<ProfileRow>) {
	return client.from('profiles').update(patch).eq('id', userId);
}

export async function upsertProfile(client: Client, profile: ProfileRow) {
	return client.from('profiles').upsert(profile);
}

export async function setPresence(
	client: Client,
	userId: string,
	status: 'online' | 'offline' | 'away'
) {
	return client
		.from('profiles')
		.update({ status, last_seen: new Date().toISOString() })
		.eq('id', userId);
}
