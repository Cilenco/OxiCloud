<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { decideDevice, lookupDeviceCode, type DeviceInfo } from '$lib/api/endpoints/device';
	import { t } from '$lib/i18n/index.svelte';

	type Step = 'code' | 'loading' | 'review' | 'approved' | 'denied' | 'error';

	let code = $state(page.url.searchParams.get('code') ?? '');
	let step = $state<Step>('code');
	let info = $state<DeviceInfo | null>(null);
	let errorText = $state('');
	let busy = $state(false);

	async function lookup(e?: SubmitEvent) {
		e?.preventDefault();
		if (!code) return;
		step = 'loading';
		errorText = '';
		try {
			info = await lookupDeviceCode(code);
			step = 'review';
		} catch (err) {
			errorText = err instanceof Error ? err.message : String(err);
			step = 'error';
		}
	}

	async function decide(action: 'approve' | 'deny') {
		busy = true;
		try {
			await decideDevice(code, action);
			step = action === 'approve' ? 'approved' : 'denied';
		} catch (err) {
			errorText = err instanceof Error ? err.message : String(err);
			step = 'error';
		} finally {
			busy = false;
		}
	}

	onMount(() => {
		if (code) void lookup();
	});
</script>

<svelte:head><title>{t('device.title', 'Device verification')} · OxiCloud</title></svelte:head>

<main class="device">
	<div class="device__card">
		<h1>{t('device.title', 'Device verification')}</h1>

		{#if step === 'code'}
			<form onsubmit={lookup}>
				<label class="device__field">
					<span>{t('device.enter_code', 'Enter the code shown on your device')}</span>
					<input bind:value={code} autocomplete="off" inputmode="text" />
				</label>
				<button type="submit" disabled={!code}>{t('device.continue', 'Continue')}</button>
			</form>
		{:else if step === 'loading'}
			<p>{t('common.loading', 'Loading…')}</p>
		{:else if step === 'review'}
			<dl class="device__info">
				<dt>{t('device.client', 'Application')}</dt>
				<dd>{info?.client_name || t('device.unknown', 'Unknown')}</dd>
				<dt>{t('device.scopes', 'Access')}</dt>
				<dd>{info?.scopes || 'all'}</dd>
			</dl>
			<div class="device__actions">
				<button class="device__deny" disabled={busy} onclick={() => decide('deny')}>
					{t('device.deny', 'Deny')}
				</button>
				<button class="device__approve" disabled={busy} onclick={() => decide('approve')}>
					{t('device.approve', 'Approve')}
				</button>
			</div>
		{:else if step === 'approved'}
			<p class="device__ok">
				{t('device.approved', 'Device approved. You can return to your device.')}
			</p>
		{:else if step === 'denied'}
			<p>{t('device.denied', 'Device access denied.')}</p>
		{:else if step === 'error'}
			<p class="device__error" role="alert">{errorText}</p>
			<button onclick={() => (step = 'code')}>{t('common.retry', 'Try again')}</button>
		{/if}
	</div>
</main>

<style>
	.device {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: var(--color-bg-page);
	}

	.device__card {
		width: min(92vw, 24rem);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 2rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-lg);
	}

	.device__field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.device__field input {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
		font-size: 1.25rem;
		letter-spacing: 0.1em;
		text-align: center;
	}

	.device__info {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
		margin: 0;
	}

	.device__info dt {
		color: var(--color-text-muted);
	}

	.device__info dd {
		margin: 0;
		color: var(--color-text);
	}

	.device__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
	}

	button {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.device__approve {
		background: var(--color-primary);
		color: var(--color-text-light);
		border-color: transparent;
	}

	.device__deny {
		color: var(--color-danger-text);
	}

	.device__ok {
		color: var(--color-success-text);
	}

	.device__error {
		color: var(--color-danger-text);
	}
</style>
