import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';
import { ATTACHMENT_BUCKET, AVATAR_BUCKET, MAX_UPLOAD_BYTES } from '../utils/constants';

type Client = SupabaseClient<Database>;

export function publicUrl(client: Client, bucket: string, path: string): string {
	const { data } = client.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}

/**
 * Sanitizes a filename to safely extract its extension.
 * This prevents path traversal attacks, limits extension length, and strips non-alphanumeric characters.
 */
export function sanitizeExtension(filename: string, defaultExt: string): string {
	const baseName = filename.split(/[/\\]/).pop() || '';
	const parts = baseName.split('.');
	if (parts.length < 2) return defaultExt;
	const ext = parts.pop() || '';
	const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '');
	return cleanExt ? cleanExt.substring(0, 10).toLowerCase() : defaultExt;
}

export async function uploadAvatar(
	client: Client,
	userId: string,
	file: File
): Promise<string | null> {
	if (file.size > MAX_UPLOAD_BYTES) return null;
	const ext = sanitizeExtension(file.name, 'jpg');
	const path = `${userId}/${crypto.randomUUID()}.${ext}`;
	const { error } = await client.storage
		.from(AVATAR_BUCKET)
		.upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
	if (error) return null;
	return publicUrl(client, AVATAR_BUCKET, path);
}

export async function uploadAttachment(
	client: Client,
	userId: string,
	file: File
): Promise<{ path: string; url: string } | null> {
	if (file.size > MAX_UPLOAD_BYTES) return null;
	const ext = sanitizeExtension(file.name, 'bin');
	const path = `${userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
	const { error } = await client.storage
		.from(ATTACHMENT_BUCKET)
		.upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
	if (error) return null;
	return { path, url: publicUrl(client, ATTACHMENT_BUCKET, path) };
}
