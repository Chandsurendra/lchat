# SvelteKit Realtime Chat App Roadmap

## Tech Stack

-   Frontend: SvelteKit + TypeScript
-   UI: Tailwind CSS + shadcn-svelte
-   Backend: Supabase
-   Database: PostgreSQL
-   Realtime: Supabase Realtime
-   Auth: Supabase Auth
-   Storage: Supabase Storage
-   Validation: Zod
-   Deployment: Vercel + Supabase

## Development Phases

### Phase 1 -- Authentication

-   Email/password
-   Google OAuth
-   Profile setup
-   Avatar upload
-   Username & bio

### Phase 2 -- Friends

-   Search users
-   Friend requests
-   Accept/reject
-   Remove friend
-   Block user

### Phase 3 -- Direct Messaging

Tables: - profiles - friend_requests - friends - conversations -
conversation_members - messages

Features: - Send/edit/delete messages - Replies - Read receipts

### Phase 4 -- Realtime

-   New messages
-   Typing indicator
-   Presence
-   Read receipts

### Phase 5 -- Chat UI

-   Sidebar
-   Chat window
-   Infinite scroll
-   Emoji picker
-   Reply/Edit/Delete

### Phase 6 -- File Sharing

-   Images
-   Videos
-   PDFs
-   Voice notes

### Phase 7 -- Groups

-   Create groups
-   Admins
-   Group avatar
-   Description

### Phase 8 -- Presence

-   Online
-   Offline
-   Away
-   Last seen

### Phase 9 -- Notifications

-   Browser
-   Email
-   Push (later)

### Phase 10 -- Search

-   Users
-   Messages
-   Groups
-   Files

### Phase 11 -- Settings

-   Profile
-   Privacy
-   Theme
-   Notifications
-   Language

### Phase 12 -- Advanced

-   Reactions
-   Pins
-   Stars
-   Threads
-   Voice messages
-   GIFs
-   Markdown
-   Code blocks
-   Polls

## Folder Structure

``` text
src/
├── routes/
│   ├── login/
│   ├── register/
│   ├── chat/
│   └── settings/
├── lib/
│   ├── components/
│   ├── stores/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   └── types/
└── server/
    ├── auth/
    ├── db/
    └── realtime/
```

## Recommended Order

1.  Authentication
2.  Profiles
3.  Friends
4.  Direct chat
5.  Realtime
6.  Read receipts
7.  Typing
8.  Presence
9.  File uploads
10. Groups
11. Search
12. Notifications
13. Reactions
14. Voice messages

## Database Principles

-   UUID primary keys
-   Enable RLS
-   Index common queries
-   Cursor pagination
-   Soft deletes
-   UTC timestamps
