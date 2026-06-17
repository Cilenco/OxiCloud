<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n/index.svelte';

	interface Props {
		loading: boolean;
		error?: string | null;
		empty: boolean;
		emptyText?: string;
		hasMore?: boolean;
		onloadmore?: () => void;
		toolbar?: Snippet;
		children: Snippet;
	}

	let {
		loading,
		error = null,
		empty,
		emptyText,
		hasMore = false,
		onloadmore,
		toolbar,
		children
	}: Props = $props();
</script>

<section class="rl">
	{#if toolbar}
		<div class="rl__toolbar">{@render toolbar()}</div>
	{/if}

	{#if error}
		<p class="rl__error" role="alert">{error}</p>
	{:else if loading && empty}
		<p class="rl__status">{t('common.loading', 'Loading…')}</p>
	{:else if empty}
		<p class="rl__status">{emptyText ?? t('common.empty', 'Nothing here yet.')}</p>
	{:else}
		<ul class="rl__list">
			{@render children()}
		</ul>
		{#if hasMore}
			<button class="rl__more" onclick={onloadmore} disabled={loading}>
				{loading ? t('common.loading', 'Loading…') : t('common.load_more', 'Load more')}
			</button>
		{/if}
	{/if}
</section>

<style>
	.rl {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1rem;
	}

	.rl__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.rl__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.rl__status,
	.rl__error {
		color: var(--color-text-muted);
		padding: 2rem 0;
		text-align: center;
	}

	.rl__error {
		color: var(--color-danger-text);
	}

	.rl__more {
		align-self: center;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-text);
		cursor: pointer;
	}
</style>
