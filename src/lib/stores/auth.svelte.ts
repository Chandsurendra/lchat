import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '#lib/database.types';
import { getSupabase } from '#lib/services/supabase';
import { getProfile, setPresence } from '#lib/services/profiles.service';

export const auth = $state({
	user: null as User | null,
	profile: null as ProfileRow | null,
	loading: true
});

export async function initAuth() {
	const supabase = getSupabase();
	const {
		data: { user }
	} = await supabase.auth.getUser();
	auth.user = user ?? null;
	if (auth.user) {
		auth.profile = await getProfile(supabase, auth.user.id);
	}
	auth.loading = false;

	supabase.auth.onAuthStateChange(async (event) => {
		if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
			const {
				data: { user }
			} = await supabase.auth.getUser();
			auth.user = user ?? null;
			if (auth.user) {
				auth.profile = await getProfile(supabase, auth.user.id);
			}
		} else if (event === 'SIGNED_OUT') {
			auth.user = null;
			auth.profile = null;
		}
	});
}

export async function refreshProfile() {
	const supabase = getSupabase();
	if (!auth.user) return;
	auth.profile = await getProfile(supabase, auth.user.id);
}

export function updatePresence(status: 'online' | 'offline' | 'away') {
	if (!auth.user) return;
	setPresence(getSupabase(), auth.user.id, status);
}
