import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$app/env/public';
import { createServerClient } from '@supabase/ssr';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet, headers) {
				/**
				 * Note: You have to add the `path` variable to the
				 * set and remove method due to sveltekit's cookie API
				 * requiring this to be set, setting the path to `/`
				 * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
				 */
				cookiesToSet.forEach(({ name, value, options }) =>
					event.cookies.set(name, value, { ...options, path: '/' })
				);
				if (Object.keys(headers).length > 0) {
					event.setHeaders(headers);
				}
			}
		}
	});

	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	// Secure response headers (Defense-in-depth)
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');

	// Build a robust, restrictive Content Security Policy (CSP)
	let supabaseDomain = '';
	let wsSupabaseDomain = '';
	try {
		if (PUBLIC_SUPABASE_URL) {
			const parsed = new URL(PUBLIC_SUPABASE_URL);
			supabaseDomain = parsed.origin;
			wsSupabaseDomain = parsed.origin.replace('https://', 'wss://').replace('http://', 'ws://');
		}
	} catch {
		// Fallback in case of invalid URL or during compilation
	}

	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'", // Necessary for Svelte's reactive runtime
		"style-src 'self' 'unsafe-inline'", // Necessary for Tailwind/Svelte styled components
		`img-src 'self' data: blob: ${supabaseDomain}`.trim(),
		`media-src 'self' blob: ${supabaseDomain}`.trim(),
		`connect-src 'self' ${supabaseDomain} ${wsSupabaseDomain}`.trim(),
		"frame-ancestors 'none'"
	].join('; ');

	response.headers.set('Content-Security-Policy', csp);

	return response;
};
