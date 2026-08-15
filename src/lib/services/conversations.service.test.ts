import { describe, test, expect } from 'bun:test';
import {
	getConversations,
	getOtherParticipant,
	conversationTitle,
	conversationAvatar
} from './conversations.service';
import type { Conversation } from '#lib/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/database.types';

type Client = SupabaseClient<Database>;

describe('conversations.service', () => {
	describe('getConversations', () => {
		test('pre-groups members and correlates last messages correctly, sorted descending by updated_at', async () => {
			const userId = 'user-1';

			const mockMembersData = [
				{
					id: 'm-1',
					conversation_id: 'conv-1',
					user_id: userId,
					role: 'member',
					last_read_at: '2025-01-01T00:00:00Z',
					muted: false,
					created_at: '2025-01-01T00:00:00Z',
					conversation: {
						id: 'conv-1',
						type: 'direct' as const,
						name: null,
						avatar_url: null,
						description: null,
						created_by: 'user-1',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T10:00:00Z'
					}
				},
				{
					id: 'm-2',
					conversation_id: 'conv-2',
					user_id: userId,
					role: 'member',
					last_read_at: '2025-01-01T00:00:00Z',
					muted: false,
					created_at: '2025-01-01T00:00:00Z',
					conversation: {
						id: 'conv-2',
						type: 'group' as const,
						name: 'Team Chat',
						avatar_url: null,
						description: null,
						created_by: 'user-2',
						created_at: '2025-01-01T00:00:00Z',
						updated_at: '2025-01-01T12:00:00Z'
					}
				}
			];

			const mockAllMembersData = [
				{
					id: 'm-1',
					conversation_id: 'conv-1',
					user_id: 'user-1',
					role: 'member',
					muted: false,
					last_read_at: null,
					profile: { id: 'user-1', display_name: 'Alice', avatar_url: null }
				},
				{
					id: 'm-3',
					conversation_id: 'conv-1',
					user_id: 'user-2',
					role: 'member',
					muted: false,
					last_read_at: null,
					profile: { id: 'user-2', display_name: 'Bob', avatar_url: null }
				},
				{
					id: 'm-2',
					conversation_id: 'conv-2',
					user_id: 'user-1',
					role: 'member',
					muted: false,
					last_read_at: null,
					profile: { id: 'user-1', display_name: 'Alice', avatar_url: null }
				}
			];

			const mockLastMessagesData = [
				{
					id: 101,
					conversation_id: 'conv-1',
					sender_id: 'user-2',
					content: 'Hello in conv 1',
					created_at: '2025-01-01T10:00:00Z',
					sender: { id: 'user-2', display_name: 'Bob', avatar_url: null }
				},
				{
					id: 102,
					conversation_id: 'conv-2',
					sender_id: 'user-1',
					content: 'Hello in conv 2',
					created_at: '2025-01-01T12:00:00Z',
					sender: { id: 'user-1', display_name: 'Alice', avatar_url: null }
				}
			];

			const mockUnreadData = [
				{ conversation_id: 'conv-1', unread_count: 2 },
				{ conversation_id: 'conv-2', unread_count: 0 }
			];

			const mockClient = {
				from: (table: string) => {
					if (table === 'conversation_members') {
						return {
							select: () => ({
								eq: () => Promise.resolve({ data: mockMembersData, error: null }),
								in: () => Promise.resolve({ data: mockAllMembersData, error: null })
							})
						};
					}
					if (table === 'conversation_last_message') {
						return {
							select: () => ({
								in: () => Promise.resolve({ data: mockLastMessagesData, error: null })
							})
						};
					}
					if (table === 'conversation_unread') {
						return {
							select: () => ({
								eq: () => Promise.resolve({ data: mockUnreadData, error: null })
							})
						};
					}
					return {};
				}
			} as unknown as Client;

			const result = await getConversations(mockClient, userId);

			expect(result.length).toBe(2);
			// Sorted descending by updated_at (conv-2 is updated_at 12:00, conv-1 is 10:00)
			expect(result[0].id).toBe('conv-2');
			expect(result[1].id).toBe('conv-1');

			// Conv-2 checks
			expect(result[0].unread_count).toBe(0);
			expect(result[0].last_message?.content).toBe('Hello in conv 2');

			// Conv-1 checks
			expect(result[1].participants.length).toBe(2);
			expect(result[1].unread_count).toBe(2);
			expect(result[1].last_message?.content).toBe('Hello in conv 1');
		});

		test('returns empty array when user is in no conversations', async () => {
			const mockClient = {
				from: () => ({
					select: () => ({
						eq: () => Promise.resolve({ data: [], error: null })
					})
				})
			} as unknown as Client;
			const result = await getConversations(mockClient, 'user-1');
			expect(result).toEqual([]);
		});
	});

	describe('helpers', () => {
		const mockProfile1 = {
			id: 'u-1',
			display_name: 'Alice',
			avatar_url: 'alice.png',
			bio: null,
			created_at: '2025-01-01',
			updated_at: '2025-01-01',
			status: 'online' as const
		};
		const mockProfile2 = {
			id: 'u-2',
			display_name: 'Bob',
			avatar_url: 'bob.png',
			bio: null,
			created_at: '2025-01-01',
			updated_at: '2025-01-01',
			status: 'offline' as const
		};

		const mockConv: Conversation = {
			id: 'conv-1',
			type: 'direct',
			name: null,
			avatar_url: null,
			description: null,
			created_by: 'u-1',
			created_at: '2025-01-01',
			updated_at: '2025-01-01',
			my_member: {
				id: 'm-1',
				conversation_id: 'conv-1',
				user_id: 'u-1',
				role: 'member',
				last_read_at: null,
				muted: false,
				created_at: '2025-01-01'
			},
			last_message: null,
			unread_count: 0,
			typing: [],
			participants: [
				{
					user_id: 'u-1',
					role: 'member',
					muted: false,
					last_read_at: null,
					profile: mockProfile1
				},
				{
					user_id: 'u-2',
					role: 'member',
					muted: false,
					last_read_at: null,
					profile: mockProfile2
				}
			]
		};

		test('getOtherParticipant finds the partner profile', () => {
			const other = getOtherParticipant(mockConv, 'u-1');
			expect(other?.user_id).toBe('u-2');
			expect(other?.profile.display_name).toBe('Bob');
		});

		test('conversationTitle returns partner name for direct conv', () => {
			expect(conversationTitle(mockConv, 'u-1')).toBe('Bob');
		});

		test('conversationAvatar returns partner avatar for direct conv', () => {
			expect(conversationAvatar(mockConv, 'u-1')).toBe('bob.png');
		});
	});
});
