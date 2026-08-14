import { describe, test, expect } from 'bun:test';
import { sanitizeExtension } from './storage.service';

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
