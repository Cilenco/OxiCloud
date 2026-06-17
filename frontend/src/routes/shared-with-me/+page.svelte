<script lang="ts">
	import { onMount } from 'svelte';
	import FileRow from '$lib/components/FileRow.svelte';
	import ResourceListShell from '$lib/components/ResourceListShell.svelte';
	import { fetchSharedWithMe, type IncomingGrantItem } from '$lib/api/endpoints/grants';
	import { t } from '$lib/i18n/index.svelte';
	import { formatDate } from '$lib/utils/display';

	let items = $state<IncomingGrantItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(reset = false) {
		loading = true;
		error = null;
		try {
			const page = await fetchSharedWithMe({ cursor: reset ? undefined : cursor });
			items = reset ? page.items : [...items, ...page.items];
			cursor = page.next_cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	onMount(() => load(true));
</script>

<svelte:head><title>{t('nav.shared_with_me', 'Shared with me')} · OxiCloud</title></svelte:head>

<h1 class="page-title">{t('nav.shared_with_me', 'Shared with me')}</h1>

<ResourceListShell
	{loading}
	{error}
	empty={items.length === 0}
	emptyText={t('shared_with_me.empty', 'Nothing has been shared with you yet.')}
	hasMore={!!cursor}
	onloadmore={() => load(false)}
>
	{#each items as item (item.resource.id)}
		<FileRow
			name={item.resource.name}
			iconClass={item.resource.icon_class}
			subtitle={item.granted_by
				? t('shared_with_me.from', { who: item.granted_by }, 'Shared by {{who}}')
				: item.resource.path}
			date={formatDate(item.granted_at)}
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
</style>
