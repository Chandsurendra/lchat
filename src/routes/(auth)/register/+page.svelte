<script lang="ts">
	import { goto } from '$app/navigation';
	import { signUpWithPassword, signInWithGoogle } from '#lib/services/auth.service';
	import { initAuth } from '#lib/stores/auth.svelte';
	import { firstError, registerSchema } from '#lib/validators/auth';

	let email = $state('');
	let password = $state('');
	let username = $state('');
	let displayName = $state('');
	let error = $state('');
	let loading = $state(false);
	let oauthLoading = $state(false);
	let confirmed = $state(false);

	async function handleSubmit() {
		error = '';
		const parsed = registerSchema.safeParse({ email, password, username, displayName });
		if (!parsed.success) {
			error = firstError(parsed.error);
			return;
		}
		loading = true;
		const { user, error: err } = await signUpWithPassword(email, password, {
			username,
			display_name: displayName
		});
		loading = false;
		if (err) {
			error = err.message;
			return;
		}
		if (user) {
			await initAuth();
			goto('/');
		} else {
			confirmed = true;
		}
	}

	async function handleGoogle() {
		oauthLoading = true;
		await signInWithGoogle();
	}
</script>

<svelte:head><title>Register — LChat</title></svelte:head>

{#if confirmed}
	<div class="text-center">
		<div
			class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950"
		>
			✉️
		</div>
		<h1 class="text-xl font-semibold">Check your email</h1>
		<p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
			We sent a confirmation link to <span class="font-medium text-zinc-700 dark:text-zinc-200"
				>{email}</span
			>. Click it to activate your account, then sign in.
		</p>
		<a
			href="/login"
			class="mt-6 inline-block font-medium text-indigo-600 hover:underline dark:text-indigo-400"
			>Go to sign in</a
		>
	</div>
{:else}
	<h1 class="text-xl font-semibold">Create your account</h1>
	<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Start chatting in under a minute</p>

	<form
		class="mt-6 space-y-4"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="grid gap-4 sm:grid-cols-2">
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
			</div>
		</div>
		<div>
			<label for="email" class="mb-1 block text-sm font-medium">Email</label>
			<input
				id="email"
				type="email"
				autocomplete="email"
				bind:value={email}
				required
				class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
			/>
		</div>
		<div>
			<label for="password" class="mb-1 block text-sm font-medium">Password</label>
			<input
				id="password"
				type="password"
				autocomplete="new-password"
				bind:value={password}
				required
				class="w-full rounded-lg border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800"
			/>
			<p class="mt-1 text-xs text-zinc-400">At least 8 characters</p>
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
			disabled={loading}
			class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
		>
			{loading ? 'Creating account…' : 'Create account'}
		</button>
	</form>

	<div class="mt-4 flex items-center gap-3 text-xs text-zinc-400">
		<div class="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
		<span>OR</span>
		<div class="h-px flex-1 bg-zinc-200 dark:bg-zinc-800"></div>
	</div>

	<button
		onclick={handleGoogle}
		disabled={oauthLoading}
		class="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2.5 font-medium transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
	>
		<svg class="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
			/>
		</svg>
		{oauthLoading ? 'Redirecting…' : 'Continue with Google'}
	</button>

	<p class="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
		Already have an account?
		<a href="/login" class="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
			>Sign in</a
		>
	</p>
{/if}
