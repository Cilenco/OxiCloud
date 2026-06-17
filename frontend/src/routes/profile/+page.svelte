<script lang="ts">
	import { onMount } from 'svelte';
	import { changePassword, updateProfile } from '$lib/api/endpoints/profile';
	import { SUPPORTED_LOCALES, setLocale, t, type Locale } from '$lib/i18n/index.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let givenName = $state('');
	let familyName = $state('');
	let username = $state('');
	let preferredLocale = $state<string>('');
	let notifyOnShare = $state(true);

	let currentPw = $state('');
	let newPw = $state('');
	let confirmPw = $state('');

	let savingProfile = $state(false);
	let savingPassword = $state(false);

	function hydrate() {
		const u = session.user;
		if (!u) return;
		givenName = u.given_name ?? '';
		familyName = u.family_name ?? '';
		username = u.username ?? '';
		preferredLocale = u.preferred_locale ?? '';
		notifyOnShare = u.notify_on_share;
	}

	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		savingProfile = true;
		try {
			const updated = await updateProfile({
				given_name: givenName,
				family_name: familyName,
				username: username || undefined,
				preferred_locale: preferredLocale || undefined,
				notify_on_share: notifyOnShare
			});
			session.user = updated;
			if (preferredLocale) await setLocale(preferredLocale as Locale);
			ui.notify(t('profile.saved', 'Profile saved'), 'success');
		} catch (err) {
			ui.notify(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			savingProfile = false;
		}
	}

	async function savePassword(e: SubmitEvent) {
		e.preventDefault();
		if (newPw !== confirmPw) {
			ui.notify(t('profile.password_mismatch', 'Passwords do not match'), 'error');
			return;
		}
		savingPassword = true;
		try {
			await changePassword(currentPw, newPw);
			currentPw = newPw = confirmPw = '';
			ui.notify(t('profile.password_updated', 'Password updated'), 'success');
		} catch (err) {
			ui.notify(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			savingPassword = false;
		}
	}

	onMount(async () => {
		if (!session.loaded) await session.load();
		hydrate();
	});
</script>

<svelte:head><title>{t('nav.profile', 'Profile')} · OxiCloud</title></svelte:head>

<main class="profile">
	<h1>{t('nav.profile', 'Profile')}</h1>

	{#if session.user}
		<p class="profile__email">{session.user.email}</p>

		<form class="card" onsubmit={saveProfile}>
			<h2>{t('profile.details', 'Profile details')}</h2>

			<label>
				<span>{t('profile.username', 'Username')}</span>
				<input bind:value={username} autocomplete="username" />
			</label>
			<label>
				<span>{t('profile.given_name', 'Given name')}</span>
				<input bind:value={givenName} autocomplete="given-name" />
			</label>
			<label>
				<span>{t('profile.family_name', 'Family name')}</span>
				<input bind:value={familyName} autocomplete="family-name" />
			</label>
			<label>
				<span>{t('profile.language', 'Language')}</span>
				<select bind:value={preferredLocale}>
					<option value="">{t('profile.language_auto', 'Automatic')}</option>
					{#each SUPPORTED_LOCALES as loc (loc)}
						<option value={loc}>{loc}</option>
					{/each}
				</select>
			</label>
			<label class="checkbox">
				<input type="checkbox" bind:checked={notifyOnShare} />
				<span>{t('profile.notify_on_share', 'Email me when something is shared with me')}</span>
			</label>

			<button type="submit" disabled={savingProfile}>{t('common.save', 'Save')}</button>
		</form>

		{#if session.user.can_edit_image !== false && session.user.auth_provider === 'local'}
			<form class="card" onsubmit={savePassword}>
				<h2>{t('profile.change_password', 'Change password')}</h2>
				<label>
					<span>{t('profile.current_password', 'Current password')}</span>
					<input type="password" bind:value={currentPw} autocomplete="current-password" />
				</label>
				<label>
					<span>{t('profile.new_password', 'New password')}</span>
					<input type="password" bind:value={newPw} autocomplete="new-password" />
				</label>
				<label>
					<span>{t('profile.confirm_password', 'Confirm new password')}</span>
					<input type="password" bind:value={confirmPw} autocomplete="new-password" />
				</label>
				<button type="submit" disabled={savingPassword}>
					{t('profile.update_password', 'Update password')}
				</button>
			</form>
		{/if}
	{:else}
		<p>{t('common.loading', 'Loading…')}</p>
	{/if}
</main>

<style>
	.profile {
		max-width: 36rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.profile__email {
		margin: -1rem 0 0;
		color: var(--color-text-muted);
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}

	.card h2 {
		margin: 0 0 0.25rem;
		font-size: 1.125rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text);
	}

	label.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	input,
	select {
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
		font-size: 1rem;
	}

	label.checkbox input {
		width: auto;
	}

	button {
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text-light);
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.6;
	}
</style>
