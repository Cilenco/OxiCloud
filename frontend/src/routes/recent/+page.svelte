<script lang="ts">
	import { onMount } from 'svelte';
	import FileRow from '$lib/components/FileRow.svelte';
	import ResourceListShell from '$lib/components/ResourceListShell.svelte';
	import { clearRecent, fetchRecentPage, type RecentResourceItem } from '$lib/api/endpoints/recent';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { formatDate } from '$lib/utils/display';

	let items = $state<RecentResourceItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(reset = false) {
		loading = true;
		error = null;
		try {
			const page = await fetchRecentPage({ cursor: reset ? undefined : cursor });
			items = reset ? page.items : [...items, ...page.items];
			cursor = page.next_cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function clearAll() {
		try {
			await clearRecent();
			items = [];
			cursor = undefined;
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	onMount(() => load(true));
</script>

<svelte:head><title>{t('nav.recent', 'Recent')} · OxiCloud</title></svelte:head>

<h1 class="page-title">{t('nav.recent', 'Recent')}</h1>

<ResourceListShell
	{loading}
	{error}
	empty={items.length === 0}
	emptyText={t('recent.empty', 'No recent items.')}
	hasMore={!!cursor}
	onloadmore={() => load(false)}
>
	{#snippet toolbar()}
		{#if items.length > 0}
			<button class="link-btn" onclick={clearAll}>{t('recent.clear', 'Clear')}</button>
		{/if}
	{/snippet}

	{#each items as item (item.resource.id + item.accessed_at)}
		<FileRow
			name={item.resource.name}
			iconClass={item.resource.icon_class}
			subtitle={item.resource.path}
			date={formatDate(item.accessed_at)}
		/>
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
