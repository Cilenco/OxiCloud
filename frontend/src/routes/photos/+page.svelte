<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchPhotos } from '$lib/api/endpoints/photos';
	import { fileInlineUrl, fileThumbnailUrl } from '$lib/api/endpoints/files';
	import type { FileItem } from '$lib/api/types';
	import { t } from '$lib/i18n/index.svelte';

	let items = $state<FileItem[]>([]);
	let cursor = $state<string | null>(null);
	let exhausted = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let sentinel = $state<HTMLElement | null>(null);

	async function loadMore() {
		if (loading || exhausted) return;
		loading = true;
		error = null;
		try {
			const page = await fetchPhotos(60, cursor);
			items = [...items, ...page.items];
			cursor = page.nextCursor;
			if (!page.nextCursor) exhausted = true;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			exhausted = true;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadMore();
		if (!sentinel) return;
		const obs = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) void loadMore();
			},
			{ rootMargin: '600px' }
		);
		obs.observe(sentinel);
		return () => obs.disconnect();
	});
</script>

<svelte:head><title>{t('nav.photos', 'Photos')} · OxiCloud</title></svelte:head>

<h1 class="page-title">{t('nav.photos', 'Photos')}</h1>

{#if error}
	<p class="status status--error" role="alert">{error}</p>
{:else if items.length === 0 && exhausted}
	<p class="status">{t('photos.empty', 'No photos yet.')}</p>
{:else}
	<ul class="photos">
		{#each items as photo (photo.id)}
			<li class="photos__cell">
				<a href={fileInlineUrl(photo.id)} target="_blank" rel="noreferrer">
					<img src={fileThumbnailUrl(photo.id)} alt={photo.name} loading="lazy" decoding="async" />
				</a>
			</li>
		{/each}
	</ul>
{/if}

<div bind:this={sentinel} class="sentinel" aria-hidden="true"></div>
{#if loading}<p class="status">{t('common.loading', 'Loading…')}</p>{/if}

<style>
	.page-title {
		margin: 0;
		padding: 1rem 1rem 0;
		font-size: 1.5rem;
		color: var(--color-text-heading);
	}

	.photos {
		list-style: none;
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
		gap: 0.25rem;
	}

	.photos__cell {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: var(--radius-sm);
		background: var(--color-bg-muted);
	}

	.photos__cell img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.status {
		text-align: center;
		color: var(--color-text-muted);
		padding: 2rem 0;
	}

	.status--error {
		color: var(--color-danger-text);
	}

	.sentinel {
		height: 1px;
	}
</style>
