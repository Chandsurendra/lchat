import { browser } from '$app/env';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '#lib/database.types';

export function createSupabaseBrowserClient() {
	return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		realtime: {
			params: { eventsPerSecond: 10 }
		}
	});
}

let _client: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSupabase() {
	if (!browser) {
		throw new Error('getSupabase() can only be called in the browser');
	}
	if (!_client) {
		_client = createSupabaseBrowserClient();
	}
	return _client;
}
