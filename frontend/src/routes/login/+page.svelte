<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { login } from '$lib/api/endpoints/auth';
	import { t } from '$lib/i18n/index.svelte';
	import { session } from '$lib/stores/session.svelte';

	let username = $state('');
	let password = $state('');
	let error = $state('');
	let busy = $state(false);

	const redirectTarget = $derived(page.url.searchParams.get('redirect') || '/files');

	function csrfCookiePresent(): boolean {
		return document.cookie.split('; ').some((c) => c.startsWith('oxicloud_csrf='));
	}

	async function onsubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		busy = true;
		try {
			const data = await login(username, password);
			// Tokens are HttpOnly cookies set by the server. Verify the browser
			// actually accepted them: the non-HttpOnly CSRF cookie must be present.
			if (!csrfCookiePresent()) {
				error = t(
					'auth.cookie_rejected',
					'Login succeeded but the browser rejected the session cookie. If you are on HTTP, set OXICLOUD_COOKIE_SECURE=false or use HTTPS.'
				);
				return;
			}
			session.user = data.user;
			await goto(redirectTarget, { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : t('auth.login_error', 'Error logging in');
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{t('app.title', 'OxiCloud')}</title>
</svelte:head>

<div class="auth-container">
	<div class="auth-panel">
		<div class="auth-logo">
			<div class="auth-logo-icon">
				<svg viewBox="120 120 280 280" aria-hidden="true">
					<path
						d="M345 310c32 0 58-26 58-58s-26-58-58-58c-6.2 0-12 0.9-17.5 2.7C318 166 289 143 255 143c-34.3 0-63.1 22.6-73 53.7C176.9 195.7 171 195 165 195c-32 0-58 26-58 58s26 58 58 58h180z"
					/>
				</svg>
			</div>
			<div class="auth-logo-text">OxiCloud</div>
		</div>

		<h1 class="auth-title">{t('auth.sign_in', 'Sign in')}</h1>

		{#if page.url.searchParams.get('source') === 'session_expired'}
			<div class="auth-error" style="display: block">
				{t('auth.session_expired', 'Your session expired. Please sign in again.')}
			</div>
		{/if}

		{#if error}
			<div class="auth-error" style="display: block" role="alert">{error}</div>
		{/if}

		<form class="auth-form" {onsubmit} novalidate>
			<div class="auth-input-group">
				<label class="auth-label" for="login-username">
					{t('auth.username', 'Username or email')}
				</label>
				<input
					id="login-username"
					class="auth-input"
					type="text"
					bind:value={username}
					autocomplete="username"
					required
					disabled={busy}
				/>
			</div>

			<div class="auth-input-group">
				<label class="auth-label" for="login-password">{t('auth.password', 'Password')}</label>
				<input
					id="login-password"
					class="auth-input"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					required
					disabled={busy}
				/>
			</div>

			<button class="auth-button" type="submit" disabled={busy} aria-busy={busy}>
				{busy ? t('auth.signing_in', 'Signing in…') : t('auth.sign_in', 'Sign in')}
			</button>
		</form>
	</div>
</div>
