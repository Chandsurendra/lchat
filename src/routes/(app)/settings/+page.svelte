<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth, refreshProfile, updatePresence } from '#lib/stores/auth.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import { updateProfile } from '#lib/services/profiles.service';
	import { uploadAvatar } from '#lib/services/storage.service';
	import { signOut } from '#lib/services/auth.service';
	import { firstError, profileSchema } from '#lib/validators/auth';
	import { theme, toggleTheme } from '#lib/stores/theme.svelte';
	import { toggleSidebar } from '#lib/stores/ui.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import { cn } from '#lib/utils/cn';

	let username = $state('');
	let displayName = $state('');
	let bio = $state('');
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state<string | null>(null);
	let error = $state('');
	let saving = $state(false);
	let saved = $state(false);

	onMount(() => {
		const p = auth.profile;
		if (p) {
			username = p.username;
			displayName = p.display_name;
			bio = p.bio ?? '';
		}
	});

	function onAvatar(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !file.type.startsWith('image/')) return;
		avatarFile = file;
		avatarPreview = URL.createObjectURL(file);
	}

	async function save() {
		error = '';
		saved = false;
		const parsed = profileSchema.safeParse({ username, displayName, bio });
		if (!parsed.success) {
			error = firstError(parsed.error);
			return;
		}
		if (!auth.user) return;
		const client = getSupabase();
		saving = true;
		let avatarUrl: string | null = null;
		if (avatarFile) avatarUrl = await uploadAvatar(client, auth.user.id, avatarFile);
		const { error: err } = await updateProfile(client, auth.user.id, {
			username: username.trim(),
			display_name: displayName.trim(),
			bio: bio.trim(),
			...(avatarUrl ? { avatar_url: avatarUrl } : {})
		});
		saving = false;
		if (err) {
			error = err.message;
			return;
		}
		await refreshProfile();
		saved = true;
	}

	async function setStatus(status: 'online' | 'away' | 'offline') {
		updatePresence(status);
		await refreshProfile();
	}

	async function handleSignOut() {
		await signOut();
		goto('/login');
	}
</script>

<div class="mx-auto max-w-2xl px-4 py-8">
	<div class="mb-6 flex items-center gap-3">
		<button
			onclick={toggleSidebar}
			aria-label="Toggle sidebar"
			class="text-zinc-500 md:hidden dark:text-zinc-400"
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg
			>
		</button>
		<h1 class="text-xl font-semibold">Settings</h1>
	</div>

	<div class="space-y-6">
		<section
			class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
			>
				Profile
			</h2>
			<div class="mb-5 flex flex-col items-center gap-2">
				<label
					class="group cursor-pointer rounded-full p-1 transition focus-within:ring-2 focus-within:ring-indigo-500"
				>
					<div class="relative">
						<Avatar
							src={avatarPreview ?? auth.profile?.avatar_url}
							name={displayName || auth.profile?.display_name || '?'}
							size={80}
						/>
						<span
							class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
							>📷</span
						>
					</div>
					<input type="file" accept="image/*" class="sr-only" onchange={onAvatar} />
				</label>
				<p class="text-xs text-zinc-400">Click avatar to change</p>
			</div>
			<div class="space-y-4">
				<div>
					<label class="mb-1 block text-sm font-medium" for="s-name">Display name</label>
					<input
						id="s-name"
						bind:value={displayName}
						class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="s-username">Username</label>
					<input
						id="s-username"
						bind:value={username}
						class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
					/>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium" for="s-bio">Bio</label>
					<textarea
						id="s-bio"
						bind:value={bio}
						rows="2"
						maxlength="160"
						class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
					></textarea>
				</div>
				{#if error}
					<p
						class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
					>
						{error}
					</p>
				{/if}
				{#if saved}
					<p
						class="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
					>
						Profile updated
					</p>
				{/if}
				<button
					onclick={save}
					disabled={saving}
					class="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
					>{saving ? 'Saving…' : 'Save changes'}</button
				>
			</div>
		</section>

		<section
			class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
			>
				Presence
			</h2>
			<div class="flex gap-2">
				{#each [{ id: 'online', label: 'Online' }, { id: 'away', label: 'Away' }, { id: 'offline', label: 'Offline' }] as s (s.id)}
					<button
						onclick={() => setStatus(s.id as 'online' | 'away' | 'offline')}
						class={cn(
							'rounded-full px-4 py-1.5 text-sm font-medium transition',
							auth.profile?.status === s.id
								? 'bg-indigo-600 text-white'
								: 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
						)}>{s.label}</button
					>
				{/each}
			</div>
		</section>

		<section
			class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
		>
			<h2
				class="mb-4 text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
			>
				Appearance
			</h2>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium">Dark mode</p>
					<p class="text-xs text-zinc-400">Switch between light and dark theme</p>
				</div>
				<button
					onclick={toggleTheme}
					class={cn(
						'relative h-7 w-12 rounded-full transition',
						theme.dark ? 'bg-indigo-600' : 'bg-zinc-300'
					)}
					aria-label="Toggle theme"
				>
					<span
						class={cn(
							'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
							theme.dark ? 'left-6' : 'left-1'
						)}
					></span>
				</button>
			</div>
		</section>

		<section
			class="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-950 dark:bg-zinc-900"
		>
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-red-500 uppercase">Account</h2>
			<p class="mb-3 text-xs text-zinc-400">
				Signed in as <span class="font-medium text-zinc-600 dark:text-zinc-300"
					>{auth.user?.email}</span
				>
			</p>
			<button
				onclick={handleSignOut}
				class="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
				>Sign out</button
			>
		</section>
	</div>
</div>
