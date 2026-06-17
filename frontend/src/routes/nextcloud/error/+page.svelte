<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/icons/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte';

	const reason = $derived(page.url.searchParams.get('reason') ?? '');
</script>

<svelte:head
	><title>{t('nextcloud.error_title', 'Something went wrong')} · OxiCloud</title></svelte:head
>

<main class="nc-status">
	<Icon name="ban" class="nc-status__icon nc-status__icon--err" />
	<h1>{t('nextcloud.error_title', 'Something went wrong')}</h1>
	<p>
		{t(
			'nextcloud.error_body',
			'The connection could not be completed. Please try again from your application.'
		)}
	</p>
	{#if reason}<p class="nc-status__reason">{reason}</p>{/if}
</main>

<style>
	.nc-status {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		text-align: center;
		padding: 2rem 1rem;
	}

	:global(.nc-status__icon) {
		font-size: 3rem;
	}

	:global(.nc-status__icon--err) {
		color: var(--color-danger-text);
	}

	.nc-status__reason {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}
</style>
