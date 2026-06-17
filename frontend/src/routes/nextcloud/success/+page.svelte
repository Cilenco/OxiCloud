<script lang="ts">
	import Icon from '$lib/icons/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte';
</script>

<svelte:head><title>{t('nextcloud.success_title', 'Access granted')} · OxiCloud</title></svelte:head
>

<main class="nc-status">
	<Icon name="check" class="nc-status__icon nc-status__icon--ok" />
	<h1>{t('nextcloud.success_title', 'Access granted')}</h1>
	<p>{t('nextcloud.success_body', 'You can now return to your application — it is connected.')}</p>
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

	:global(.nc-status__icon--ok) {
		color: var(--color-success-text);
	}
</style>
