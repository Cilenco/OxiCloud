<script lang="ts">
	import { onMount } from 'svelte';
	import FileRow from '$lib/components/FileRow.svelte';
	import ResourceListShell from '$lib/components/ResourceListShell.svelte';
	import {
		fetchFavoritesPage,
		removeFavorite,
		type FavoritesResourceItem
	} from '$lib/api/endpoints/favorites';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { formatDate } from '$lib/utils/display';

	let items = $state<FavoritesResourceItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(reset = false) {
		loading = true;
		error = null;
		try {
			const page = await fetchFavoritesPage({ cursor: reset ? undefined : cursor });
			items = reset ? page.items : [...items, ...page.items];
			cursor = page.next_cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function unfavorite(item: FavoritesResourceItem) {
		try {
			await removeFavorite(item.resource_type, item.resource.id);
			items = items.filter((i) => i.resource.id !== item.resource.id);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	onMount(() => load(true));
</script>

<svelte:head><title>{t('nav.favorites', 'Favorites')} · OxiCloud</title></svelte:head>

<h1 class="page-title">{t('nav.favorites', 'Favorites')}</h1>

<ResourceListShell
	{loading}
	{error}
	empty={items.length === 0}
	emptyText={t('favorites.empty', 'No favorites yet.')}
	hasMore={!!cursor}
	onloadmore={() => load(false)}
>
	{#each items as item (item.resource.id)}
		<FileRow
			name={item.resource.name}
			iconClass={item.resource.icon_class}
			subtitle={item.resource.path}
			date={formatDate(item.favorited_at)}
		>
			{#snippet actions()}
				<button class="link-btn" onclick={() => unfavorite(item)}>
					{t('favorites.remove', 'Remove')}
				</button>
			{/snippet}
		</FileRow>
	{/each}
</ResourceListShell>

<style>
	.page-title {
		margin: 0;
		padding: 1rem 1rem 0;
		font-size: 1.5rem;
		color: var(--color-text-heading);
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.875rem;
	}
</style>
