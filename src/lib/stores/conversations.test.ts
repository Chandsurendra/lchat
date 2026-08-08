/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock, describe, it, expect, beforeEach, beforeAll } from 'bun:test';

// Define Svelte 5 runes on globalThis so Svelte files can run outside of Svelte compiler
(globalThis as any).$state = (val: any) => val;
(globalThis as any).$derived = (fn: any) => fn;

// Set up the mocks immediately
mock.module('$app/env', () => ({
	browser: true
}));

mock.module('$app/env/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'example-key'
}));

mock.module('@supabase/ssr', () => ({
	createBrowserClient: () => ({
		auth: {
			getUser: async () => ({ data: { user: { id: 'my-user-id' } } })
		}
	})
}));

// Declare store exports that will be dynamically imported
let chat: any;
let applyMemberUpdate: any;
let updateConversationLocally: any;
let mergeMessages: any;

describe('Conversations Reactive Store', () => {
	beforeAll(async () => {
		const mod = await import('./conversations.svelte');
		chat = mod.chat;
		applyMemberUpdate = mod.applyMemberUpdate;
		updateConversationLocally = mod.updateConversationLocally;
		mergeMessages = mod.mergeMessages;
	});

	beforeEach(() => {
		// Reset store states
		chat.conversations = [];
		chat.activeConversationId = null;
		chat.activeUserId = null;
		chat.messages = [];
	});

	it('should merge messages correctly and sort them by id', () => {
		const existing: any[] = [
			{ id: 2, content: 'two' },
			{ id: 5, content: 'five' }
		];
		const next: any[] = [
			{ id: 1, content: 'one' },
			{ id: 2, content: 'two updated' },
			{ id: 3, content: 'three' }
		];

		const merged = mergeMessages(existing, next);
		expect(merged.length).toBe(4);
		expect(merged[0].id).toBe(1);
		expect(merged[1].id).toBe(2);
		expect(merged[1].content).toBe('two'); // Original/existing message takes precedence during merge
		expect(merged[2].id).toBe(3);
		expect(merged[3].id).toBe(5);
	});

	it('should update conversation locally', () => {
		const sampleConv: any = {
			id: 'conv-123',
			type: 'group',
			name: 'Original Group Name',
			description: 'Original Description',
			avatar_url: 'http://avatar.url',
			created_by: 'user-1',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			participants: [],
			my_member: {
				id: 'mem-1',
				conversation_id: 'conv-123',
				user_id: 'user-1',
				role: 'owner',
				muted: false
			},
			unread_count: 0,
			typing: []
		};

		chat.conversations = [sampleConv];

		updateConversationLocally('conv-123', {
			name: 'New Beautiful Group Name',
			description: 'New Description!'
		});

		const updated = chat.conversations.find((c: any) => c.id === 'conv-123');
		expect(updated).toBeDefined();
		expect(updated?.name).toBe('New Beautiful Group Name');
		expect(updated?.description).toBe('New Description!');
		expect(updated?.avatar_url).toBe('http://avatar.url'); // Unchanged
	});

	it('should apply member updates correctly including muted status', () => {
		chat.activeUserId = 'my-user-id';

		const sampleConv: any = {
			id: 'conv-456',
			type: 'direct',
			name: 'Direct Chat',
			description: null,
			avatar_url: null,
			created_by: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			participants: [
				{
					user_id: 'my-user-id',
					role: 'member',
					muted: false,
					last_read_at: new Date().toISOString(),
					profile: { id: 'my-user-id', display_name: 'Me', username: 'me' }
				}
			],
			my_member: {
				id: 'mem-2',
				conversation_id: 'conv-456',
				user_id: 'my-user-id',
				role: 'member',
				muted: false,
				last_read_at: new Date().toISOString()
			},
			unread_count: 0,
			typing: []
		};

		chat.conversations = [sampleConv];

		// Apply update muting the member
		applyMemberUpdate('conv-456', {
			user_id: 'my-user-id',
			muted: true
		});

		const updated = chat.conversations[0];
		expect(updated.my_member.muted).toBe(true);
		expect(updated.participants[0].muted).toBe(true);
	});
});
