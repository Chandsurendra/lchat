import { describe, test, expect } from 'bun:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeExtension, uploadAvatar } from './storage.service';
import { MAX_AVATAR_BYTES } from '../utils/constants';

describe('uploadAvatar validation', () => {
	test('should reject files exceeding MAX_AVATAR_BYTES', async () => {
		const mockClient = {} as unknown as SupabaseClient;
		const largeFile = new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], 'avatar.png', {
			type: 'image/png'
		});
		const result = await uploadAvatar(mockClient, 'user123', largeFile);
		expect(result).toBeNull();
	});

	test('should reject non-image MIME types', async () => {
		const mockClient = {} as unknown as SupabaseClient;
		const execFile = new File(['echo hello'], 'script.sh', {
			type: 'application/x-sh'
		});
		const result = await uploadAvatar(mockClient, 'user123', execFile);
		expect(result).toBeNull();
	});
});

describe('sanitizeExtension', () => {
	test('should return normal extension for standard filenames', () => {
		expect(sanitizeExtension('avatar.png', 'jpg')).toBe('png');
		expect(sanitizeExtension('photo.JPEG', 'jpg')).toBe('jpeg');
		expect(sanitizeExtension('document.pdf', 'bin')).toBe('pdf');
	});

	test('should use default extension when no dot exists', () => {
		expect(sanitizeExtension('avatar', 'jpg')).toBe('jpg');
		expect(sanitizeExtension('photo_no_ext', 'png')).toBe('png');
	});

	test('should use default extension when extension is empty', () => {
		expect(sanitizeExtension('avatar.', 'jpg')).toBe('jpg');
		expect(sanitizeExtension('document..', 'bin')).toBe('bin');
	});

	test('should extract only the last segment for filenames with multiple dots', () => {
		expect(sanitizeExtension('archive.tar.gz', 'bin')).toBe('gz');
		expect(sanitizeExtension('my.cool.avatar.png', 'jpg')).toBe('png');
	});

	test('should prevent path traversal attacks by isolating the basename first', () => {
		// Attempting traversal in extension: test.jpg/../../otheruser/avatar -> default (or sanitized alphanumeric)
		expect(sanitizeExtension('test.jpg/../../otheruser/avatar', 'jpg')).toBe('jpg');
		expect(sanitizeExtension('test.jpg\\..\\..\\otheruser\\avatar', 'jpg')).toBe('jpg');
	});

	test('should strip non-alphanumeric characters from the extension', () => {
		expect(sanitizeExtension('file.png?token=xy', 'png')).toBe('pngtokenxy');
		expect(sanitizeExtension('file.sh;rm -rf', 'bin')).toBe('shrmrf');
	});

	test('should enforce strict length limits on the extension', () => {
		expect(sanitizeExtension('file.extremelylongextensionnamehere', 'bin')).toBe('extremelyl');
	});
});
