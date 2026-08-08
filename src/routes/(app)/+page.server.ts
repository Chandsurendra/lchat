import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getProfile } from '#lib/services/profiles.service';

export const load: PageServerLoad = async ({ locals }) => {
	const {
		data: { user }
	} = await locals.supabase.auth.getUser();
	if (!user) redirect(303, '/login');
	const profile = await getProfile(locals.supabase, user.id);
	if (!profile) redirect(303, '/onboarding');
	redirect(303, '/chat');
};
