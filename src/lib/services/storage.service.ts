import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/database.types';
import { ATTACHMENT_BUCKET, AVATAR_BUCKET, MAX_UPLOAD_BYTES } from '#lib/utils/constants';

type Client = SupabaseClient<Database>;

export function publicUrl(client: Client, bucket: string, path: string): string {
	const { data } = client.storage.from(bucket).getPublicUrl(path);
	return data.publicUrl;
}

export async function uploadAvatar(
	client: Client,
	userId: string,
	file: File
): Promise<string | null> {
	const ext = file.name.split('.').pop() ?? 'jpg';
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
	const ext = file.name.split('.').pop() ?? 'bin';
	const path = `${userId}/${Date.now()}_${crypto.randomUUID()}.${ext}`;
	const { error } = await client.storage
		.from(ATTACHMENT_BUCKET)
		.upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
	if (error) return null;
	return { path, url: publicUrl(client, ATTACHMENT_BUCKET, path) };
}
