export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					username: string;
					display_name: string;
					avatar_url: string | null;
					bio: string | null;
					status: 'online' | 'offline' | 'away';
					last_seen: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					username: string;
					display_name: string;
					avatar_url?: string | null;
					bio?: string | null;
					status?: 'online' | 'offline' | 'away';
					last_seen?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					username?: string;
					display_name?: string;
					avatar_url?: string | null;
					bio?: string | null;
					status?: 'online' | 'offline' | 'away';
					last_seen?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			friend_requests: {
				Row: {
					id: string;
					sender_id: string;
					recipient_id: string;
					status: 'pending' | 'accepted' | 'declined';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					sender_id: string;
					recipient_id: string;
					status?: 'pending' | 'accepted' | 'declined';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					sender_id?: string;
					recipient_id?: string;
					status?: 'pending' | 'accepted' | 'declined';
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'friend_requests_sender_id_fkey';
						columns: ['sender_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friend_requests_recipient_id_fkey';
						columns: ['recipient_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			friends: {
				Row: {
					id: string;
					user_id: string;
					friend_id: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					friend_id: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					friend_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'friends_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'friends_friend_id_fkey';
						columns: ['friend_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			blocked_users: {
				Row: {
					id: string;
					user_id: string;
					blocked_id: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					blocked_id: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					blocked_id?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'blocked_users_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'blocked_users_blocked_id_fkey';
						columns: ['blocked_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			conversations: {
				Row: {
					id: string;
					type: 'direct' | 'group';
					name: string | null;
					avatar_url: string | null;
					description: string | null;
					created_by: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					type: 'direct' | 'group';
					name?: string | null;
					avatar_url?: string | null;
					description?: string | null;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					type?: 'direct' | 'group';
					name?: string | null;
					avatar_url?: string | null;
					description?: string | null;
					created_by?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'conversations_created_by_fkey';
						columns: ['created_by'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			conversation_members: {
				Row: {
					id: string;
					conversation_id: string;
					user_id: string;
					role: 'owner' | 'admin' | 'member';
					last_read_at: string;
					muted: boolean;
					created_at: string;
				};
				Insert: {
					id?: string;
					conversation_id: string;
					user_id: string;
					role?: 'owner' | 'admin' | 'member';
					last_read_at?: string;
					muted?: boolean;
					created_at?: string;
				};
				Update: {
					id?: string;
					conversation_id?: string;
					user_id?: string;
					role?: 'owner' | 'admin' | 'member';
					last_read_at?: string;
					muted?: boolean;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'conversation_members_conversation_id_fkey';
						columns: ['conversation_id'];
						referencedRelation: 'conversations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'conversation_members_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			messages: {
				Row: {
					id: number;
					conversation_id: string;
					sender_id: string;
					parent_id: number | null;
					content: string;
					type: 'text' | 'image' | 'video' | 'audio' | 'file';
					file_url: string | null;
					file_name: string | null;
					file_size: number | null;
					duration: number | null;
					edited_at: string | null;
					deleted_at: string | null;
					created_at: string;
				};
				Insert: {
					id?: number;
					conversation_id: string;
					sender_id: string;
					parent_id?: number | null;
					content?: string;
					type?: 'text' | 'image' | 'video' | 'audio' | 'file';
					file_url?: string | null;
					file_name?: string | null;
					file_size?: number | null;
					duration?: number | null;
					edited_at?: string | null;
					deleted_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: number;
					conversation_id?: string;
					sender_id?: string;
					parent_id?: number | null;
					content?: string;
					type?: 'text' | 'image' | 'video' | 'audio' | 'file';
					file_url?: string | null;
					file_name?: string | null;
					file_size?: number | null;
					duration?: number | null;
					edited_at?: string | null;
					deleted_at?: string | null;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'messages_conversation_id_fkey';
						columns: ['conversation_id'];
						referencedRelation: 'conversations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_sender_id_fkey';
						columns: ['sender_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'messages_parent_id_fkey';
						columns: ['parent_id'];
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					}
				];
			};
			message_reads: {
				Row: {
					message_id: number;
					user_id: string;
					read_at: string;
				};
				Insert: {
					message_id: number;
					user_id: string;
					read_at?: string;
				};
				Update: {
					message_id?: number;
					user_id?: string;
					read_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_reads_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reads_message_id_fkey';
						columns: ['message_id'];
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					}
				];
			};
			message_reactions: {
				Row: {
					id: string;
					message_id: number;
					user_id: string;
					emoji: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					message_id: number;
					user_id: string;
					emoji: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					message_id?: number;
					user_id?: string;
					emoji?: string;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'message_reactions_message_id_fkey';
						columns: ['message_id'];
						referencedRelation: 'messages';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'message_reactions_user_id_fkey';
						columns: ['user_id'];
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: {
			conversation_last_message: {
				Row: {
					conversation_id: string;
					id: number;
					sender_id: string;
					content: string;
					type: 'text' | 'image' | 'video' | 'audio' | 'file';
					file_url: string | null;
					file_name: string | null;
					file_size: number | null;
					duration: number | null;
					parent_id: number | null;
					edited_at: string | null;
					deleted_at: string | null;
					created_at: string;
				};
				Insert: never;
				Update: never;
				Relationships: [];
			};
			conversation_unread: {
				Row: {
					conversation_id: string;
					user_id: string;
					unread_count: number;
				};
				Insert: never;
				Update: never;
				Relationships: [];
			};
		};
		Functions: {
			get_or_create_direct_conversation: {
				Args: { p_other: string };
				Returns: string;
			};
			accept_friend_request: {
				Args: { p_request_id: string };
				Returns: boolean;
			};
			set_updated_at: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
			touch_conversation: {
				Args: Record<PropertyKey, never>;
				Returns: undefined;
			};
		};
		Enums: Record<string, never>;
		CompositeTypes: Record<string, never>;
	};
};

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type FriendRequestRow = Database['public']['Tables']['friend_requests']['Row'];
export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type ConversationMemberRow = Database['public']['Tables']['conversation_members']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type MessageReactionRow = Database['public']['Tables']['message_reactions']['Row'];
