import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('External link security (Reverse Tabnabbing)', () => {
	test('MessageBubble.svelte uses rel="noopener noreferrer" for target="_blank"', () => {
		const content = readFileSync(resolve('src/lib/components/chat/MessageBubble.svelte'), 'utf-8');
		expect(content).toContain('target="_blank"');
		expect(content).toContain('rel="noopener noreferrer"');
		expect(content).not.toMatch(/target="_blank"\s+rel="noreferrer"/);
	});

	test('AttachmentPreview.svelte uses rel="noopener noreferrer" for target="_blank"', () => {
		const content = readFileSync(
			resolve('src/lib/components/chat/AttachmentPreview.svelte'),
			'utf-8'
		);
		expect(content).toContain('target="_blank"');
		expect(content).toContain('rel="noopener noreferrer"');
		expect(content).not.toMatch(/target="_blank"\s+rel="noreferrer"/);
	});
});
