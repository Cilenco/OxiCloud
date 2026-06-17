<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { apiFetch } from '$lib/api/client';
	import { t } from '$lib/i18n/index.svelte';

	// Nextcloud Login Flow v2. The form does a NATIVE POST to the backend flow
	// endpoint so the server drives the redirect handshake — do not intercept it.
	// The flow token is hex; reject anything else to prevent action injection.
	const token = $derived(page.url.searchParams.get('token') ?? '');
	const validToken = $derived(/^[0-9a-fA-F]+$/.test(token));
	const formAction = $derived(`/login/v2/flow/${token}`);

	let oidcEnabled = $state(false);
	let oidcProvider = $state('SSO');
	let passwordLoginEnabled = $state(true);

	onMount(async () => {
		try {
			const resp = await apiFetch('/api/auth/oidc/providers');
			if (!resp.ok) return;
			const info = (await resp.json()) as {
				enabled?: boolean;
				provider_name?: string;
				password_login_enabled?: boolean;
			};
			if (!info.enabled) return;
			oidcEnabled = true;
			oidcProvider = info.provider_name || 'SSO';
			passwordLoginEnabled = info.password_login_enabled !== false;
		} catch {
			/* OIDC not available — password-only */
		}
	});
</script>

<svelte:head><title>{t('app.title', 'OxiCloud')}</title></svelte:head>

<main class="nc">
	<div class="nc__card">
		<h1>{t('nextcloud.grant_title', 'Grant access')}</h1>

		{#if !validToken}
			<p class="nc__error">{t('nextcloud.invalid_token', 'Invalid session token.')}</p>
		{:else}
			{#if passwordLoginEnabled}
				<form method="post" action={formAction} class="nc__form">
					<label>
						<span>{t('auth.username', 'Username or email')}</span>
						<input name="user" type="text" autocomplete="username" required />
					</label>
					<label>
						<span>{t('auth.password', 'Password')}</span>
						<input name="password" type="password" autocomplete="current-password" required />
					</label>
					<button type="submit">{t('nextcloud.grant', 'Grant access')}</button>
				</form>
			{/if}

			{#if oidcEnabled}
				<div class="nc__oidc">
					<a class="nc__sso" href={`/login/v2/flow/${token}/oidc`}>
						{t('nextcloud.sign_in_with', { provider: oidcProvider }, 'Sign in with {{provider}}')}
					</a>
				</div>
			{/if}
		{/if}
	</div>
</main>

<style>
	.nc {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: var(--color-bg-page);
	}

	.nc__card {
		width: min(92vw, 22rem);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
	}

	.nc__form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-size: 0.875rem;
	}

	input {
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
	}

	button,
	.nc__sso {
		display: inline-block;
		text-align: center;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text-light);
		text-decoration: none;
		cursor: pointer;
	}

	.nc__error {
		color: var(--color-danger-text);
	}
</style>
