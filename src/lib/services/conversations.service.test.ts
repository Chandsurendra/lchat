import { describe, expect, it } from 'bun:test';
import { getConversations } from './conversations.service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('getConversations', () => {
	it('should index members and last messages, and sort conversations by updated_at descending', async () => {
		const mockClient = {
			from: (table: string) => {
				if (table === 'conversation_members') {
					return {
						select: () => ({
							eq: (_col: string, val: string) => {
								if (val === 'user-1') {
									return Promise.resolve({
										data: [
											{
												id: 'm1',
												conversation_id: 'conv-1',
												user_id: 'user-1',
												role: 'owner',
												muted: false,
												last_read_at: '2025-01-01T00:00:00Z',
												created_at: '2025-01-01T00:00:00Z',
												conversation: {
													id: 'conv-1',
													type: 'direct',
													name: null,
													avatar_url: null,
													description: null,
													created_by: 'user-1',
													created_at: '2025-01-01T00:00:00Z',
													updated_at: '2025-01-01T10:00:00Z'
												}
											},
											{
												id: 'm2',
												conversation_id: 'conv-2',
												user_id: 'user-1',
												role: 'member',
												muted: false,
												last_read_at: '2025-01-01T00:00:00Z',
												created_at: '2025-01-01T00:00:00Z',
												conversation: {
													id: 'conv-2',
													type: 'group',
													name: 'Group Chat',
													avatar_url: null,
													description: null,
													created_by: 'user-2',
													created_at: '2025-01-01T00:00:00Z',
													updated_at: '2025-01-01T12:00:00Z' // updated more recently
												}
											}
										]
									});
								}
								return Promise.resolve({ data: [] });
							},
							in: () => {
								return Promise.resolve({
									data: [
										{
											id: 'm1',
											conversation_id: 'conv-1',
											user_id: 'user-1',
											role: 'owner',
											muted: false,
											last_read_at: '2025-01-01T00:00:00Z',
											profile: { id: 'user-1', display_name: 'User 1' }
										},
										{
											id: 'm2',
											conversation_id: 'conv-2',
											user_id: 'user-1',
											role: 'member',
											muted: false,
											last_read_at: '2025-01-01T00:00:00Z',
											profile: { id: 'user-1', display_name: 'User 1' }
										},
										{
											id: 'm3',
											conversation_id: 'conv-2',
											user_id: 'user-2',
											role: 'owner',
											muted: false,
											last_read_at: '2025-01-01T00:00:00Z',
											profile: { id: 'user-2', display_name: 'User 2' }
										}
									]
								});
							}
						})
					};
				}
				if (table === 'conversation_last_message') {
					return {
						select: () => ({
							in: () =>
								Promise.resolve({
									data: [
										{
											id: 101,
											conversation_id: 'conv-2',
											content: 'Hello group!',
											sender_id: 'user-2',
											created_at: '2025-01-01T12:00:00Z',
											sender: { id: 'user-2', display_name: 'User 2' }
										}
									]
								})
						})
					};
				}
				if (table === 'conversation_unread') {
					return {
						select: () => ({
							eq: () =>
								Promise.resolve({
									data: [
										{ conversation_id: 'conv-1', unread_count: 0 },
										{ conversation_id: 'conv-2', unread_count: 3 }
									]
								})
						})
					};
				}
				return {};
			}
		} as unknown as SupabaseClient;

		const conversations = await getConversations(mockClient, 'user-1');

		expect(conversations.length).toBe(2);
		// conv-2 should be first because updated_at is 12:00:00 vs 10:00:00
		expect(conversations[0].id).toBe('conv-2');
		expect(conversations[1].id).toBe('conv-1');

		// Check participant mapping on conv-2
		expect(conversations[0].participants.length).toBe(2);
		expect(conversations[0].unread_count).toBe(3);
		expect(conversations[0].last_message?.content).toBe('Hello group!');

		// Check conv-1 with no last_message
		expect(conversations[1].last_message).toBeNull();
		expect(conversations[1].unread_count).toBe(0);
	});

	it('should return empty array when user has no conversation memberships', async () => {
		const mockClient = {
			from: () => ({
				select: () => ({
					eq: () => Promise.resolve({ data: [] })
				})
			})
		} as unknown as SupabaseClient;

		const result = await getConversations(mockClient, 'empty-user');
		expect(result).toBeArray();
		expect(result.length).toBe(0);
	});
});
