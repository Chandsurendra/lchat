import { getSupabase } from '#lib/services/supabase';

export async function signInWithPassword(email: string, password: string) {
	const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
	return { user: data.user, error };
}

export async function signUpWithPassword(
	email: string,
	password: string,
	metadata: Record<string, unknown>
) {
	const { data, error } = await getSupabase().auth.signUp({
		email,
		password,
		options: { data: metadata }
	});
	return { user: data.user, error };
}

export async function signInWithGoogle() {
	const { error } = await getSupabase().auth.signInWithOAuth({
		provider: 'google',
		options: { redirectTo: `${window.location.origin}/auth/callback` }
	});
	return { error };
}

export async function signOut() {
	return getSupabase().auth.signOut();
}
