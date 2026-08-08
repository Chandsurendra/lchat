<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth, refreshProfile, updatePresence } from '#lib/stores/auth.svelte';
	import { getSupabase } from '#lib/services/supabase';
	import { upsertProfile } from '#lib/services/profiles.service';
	import { uploadAvatar } from '#lib/services/storage.service';
	import { firstError, profileSchema } from '#lib/validators/auth';
	import Avatar from '#lib/components/ui/Avatar.svelte';

	let username = $state('');
	let displayName = $state('');
	let bio = $state('');
	let avatarFile = $state<File | null>(null);
	let avatarPreview = $state<string | null>(null);
	let error = $state('');
	let saving = $state(false);

	onMount(() => {
		if (auth.profile) {
			goto('/chat', { replaceState: true });
			return;
		}
		const user = auth.user;
		if (user) {
			username = (user.user_metadata.username as string) ?? '';
			displayName = (user.user_metadata.display_name as string) ?? user.email?.split('@')[0] ?? '';
		}
	});

	function onAvatar(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			error = 'Please choose an image file';
			return;
		}
		error = '';
		avatarFile = file;
		avatarPreview = URL.createObjectURL(file);
	}

	async function submit() {
		error = '';
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
		const { error: err } = await upsertProfile(client, {
			id: auth.user.id,
			username: username.trim(),
			display_name: displayName.trim(),
			bio: bio.trim(),
			avatar_url: avatarUrl,
			status: 'online',
			last_seen: new Date().toISOString(),
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});
		saving = false;
		if (err) {
			error = err.message;
			return;
		}
		await refreshProfile();
		updatePresence('online');
		goto('/chat');
	}
</script>

<svelte:head><title>Set up your profile — LChat</title></svelte:head>

<div class="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-10">
	<div
		class="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900"
	>
		<h1 class="text-xl font-semibold">Set up your profile</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">How should people see you on LChat?</p>

		<div class="mt-6 flex flex-col items-center gap-3">
			<label class="group cursor-pointer">
				<div class="relative">
					<Avatar src={avatarPreview} name={displayName || '?'} size={88} />
					<span
						class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
						>📷</span
					>
				</div>
				<input type="file" accept="image/*" class="hidden" onchange={onAvatar} />
			</label>
			<p class="text-xs text-zinc-400">Click to upload an avatar</p>
		</div>

		<form
			class="mt-6 space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<div>
				<label for="displayName" class="mb-1 block text-sm font-medium">Display name</label>
				<input
					id="displayName"
					bind:value={displayName}
					required
					class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
				/>
			</div>
			<div>
				<label for="username" class="mb-1 block text-sm font-medium">Username</label>
				<input
					id="username"
					bind:value={username}
					required
					class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
					placeholder="e.g. alex_dev"
				/>
				<p class="mt-1 text-xs text-zinc-400">3-20 characters, letters, numbers, underscores</p>
			</div>
			<div>
				<label for="bio" class="mb-1 block text-sm font-medium">Bio</label>
				<textarea
					id="bio"
					bind:value={bio}
					rows="2"
					maxlength="160"
					class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
					placeholder="A short intro…"></textarea>
			</div>

			{#if error}
				<p
					class="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400"
				>
					{error}
				</p>
			{/if}

			<button
				type="submit"
				disabled={saving}
				class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
			>
				{saving ? 'Saving…' : 'Finish setup'}
			</button>
		</form>
	</div>
</div>
