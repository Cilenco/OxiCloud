<script lang="ts">
	import { onMount } from 'svelte';
	import FileRow from '$lib/components/FileRow.svelte';
	import ResourceListShell from '$lib/components/ResourceListShell.svelte';
	import {
		deleteTrashItem,
		emptyTrash,
		fetchTrashPage,
		restoreTrashItem
	} from '$lib/api/endpoints/trash';
	import type { TrashResourceItem } from '$lib/api/types';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { formatDate } from '$lib/utils/display';

	let items = $state<TrashResourceItem[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function load(reset = false) {
		loading = true;
		error = null;
		try {
			const page = await fetchTrashPage({ cursor: reset ? undefined : cursor });
			items = reset ? page.items : [...items, ...page.items];
			cursor = page.next_cursor;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function restore(item: TrashResourceItem) {
		try {
			await restoreTrashItem(item.resource.id);
			items = items.filter((i) => i.resource.id !== item.resource.id);
			ui.notify(t('trash.restored', 'Restored'), 'success');
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function purge(item: TrashResourceItem) {
		if (!confirm(t('trash.confirm_delete', 'Permanently delete this item?'))) return;
		try {
			await deleteTrashItem(item.resource.id);
			items = items.filter((i) => i.resource.id !== item.resource.id);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function purgeAll() {
		if (!confirm(t('trash.confirm_empty', 'Empty the trash? This cannot be undone.'))) return;
		try {
			await emptyTrash();
			items = [];
			cursor = undefined;
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	onMount(() => load(true));
</script>

<svelte:head><title>{t('nav.trash', 'Trash')} · OxiCloud</title></svelte:head>

<h1 class="page-title">{t('nav.trash', 'Trash')}</h1>

<ResourceListShell
	{loading}
	{error}
	empty={items.length === 0}
	emptyText={t('trash.empty', 'Trash is empty.')}
	hasMore={!!cursor}
	onloadmore={() => load(false)}
>
	{#snippet toolbar()}
		{#if items.length > 0}
			<button class="link-btn link-btn--danger" onclick={purgeAll}>
				{t('trash.empty_action', 'Empty trash')}
			</button>
		{/if}
	{/snippet}

	{#each items as item (item.resource.id)}
		<FileRow
			name={item.resource.name}
			iconClass={item.resource.icon_class}
			subtitle={item.resource.path}
			date={formatDate(item.deletion_date)}
		>
			{#snippet actions()}
				<button class="link-btn" onclick={() => restore(item)}>
					{t('trash.restore', 'Restore')}
				</button>
				<button class="link-btn link-btn--danger" onclick={() => purge(item)}>
					{t('trash.delete', 'Delete')}
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

	.link-btn--danger {
		color: var(--color-danger-text);
	}
</style>
