<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/icons/Icon.svelte';
	import {
		createFolder,
		deleteFolder,
		getFolder,
		listFolder,
		renameFolder,
		type FolderListing
	} from '$lib/api/endpoints/folders';
	import {
		deleteFile,
		fileDownloadUrl,
		fileInlineUrl,
		renameFile,
		uploadFile
	} from '$lib/api/endpoints/files';
	import type { FileItem, FolderItem } from '$lib/api/types';
	import { t } from '$lib/i18n/index.svelte';
	import { files as filesStore } from '$lib/stores/files.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { formatBytes } from '$lib/utils/format';
	import { formatDate, iconNameFromClass } from '$lib/utils/display';

	// The URL rest param is the trail of folder ids from home's children down.
	// /files → home root; /files/a/b → folder b inside a inside home.
	const pathSegments = $derived((page.params.path ?? '').split('/').filter((s) => s.length > 0));

	let listing = $state<FolderListing>({ folders: [], files: [] });
	let crumbs = $state<Array<{ id: string; name: string }>>([]);
	let currentId = $state<string | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);
	let dragOver = $state(false);

	async function buildCrumbs(segments: string[]): Promise<Array<{ id: string; name: string }>> {
		// Names for each id in the trail; tolerate failures with a fallback label.
		const metas = await Promise.all(
			segments.map((id) =>
				getFolder(id)
					.then((f) => ({ id, name: f.name }))
					.catch(() => ({ id, name: '…' }))
			)
		);
		return metas;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			// External users have no home folder; send them to shared-with-me.
			if (session.isExternalUser && pathSegments.length === 0) {
				await goto('/shared-with-me', { replaceState: true });
				return;
			}
			const home = await session.loadHomeFolder();
			const folderId = pathSegments.at(-1) ?? home;
			if (!folderId) {
				error = t('files.no_home', 'No home folder available.');
				return;
			}
			currentId = folderId;
			filesStore.currentFolder = folderId;
			const [data, trail] = await Promise.all([listFolder(folderId), buildCrumbs(pathSegments)]);
			listing = data;
			crumbs = trail;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function openFolder(folder: FolderItem) {
		goto(`/files/${[...pathSegments, folder.id].join('/')}`);
	}

	function crumbHref(index: number): string {
		return `/files/${pathSegments.slice(0, index + 1).join('/')}`;
	}

	async function onNewFolder() {
		const name = prompt(t('files.new_folder_prompt', 'New folder name'));
		if (!name) return;
		try {
			await createFolder(name, currentId);
			await load();
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function onUpload(e: Event) {
		const input = e.target as HTMLInputElement;
		if (!input.files?.length) return;
		uploading = true;
		try {
			for (const file of Array.from(input.files)) {
				await uploadFile(currentId, file);
			}
			ui.notify(t('files.uploaded', 'Upload complete'), 'success');
			await load();
		} catch (err) {
			ui.notify(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			uploading = false;
			input.value = '';
		}
	}

	async function onDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const dropped = e.dataTransfer?.files;
		if (!dropped?.length) return;
		uploading = true;
		try {
			for (const file of Array.from(dropped)) await uploadFile(currentId, file);
			ui.notify(t('files.uploaded', 'Upload complete'), 'success');
			await load();
		} catch (err) {
			ui.notify(err instanceof Error ? err.message : String(err), 'error');
		} finally {
			uploading = false;
		}
	}

	async function renameItem(kind: 'file' | 'folder', id: string, current: string) {
		const name = prompt(t('files.rename_prompt', 'New name'), current);
		if (!name || name === current) return;
		try {
			if (kind === 'file') await renameFile(id, name);
			else await renameFolder(id, name);
			await load();
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function deleteItem(kind: 'file' | 'folder', id: string, name: string) {
		if (!confirm(t('files.confirm_delete', { name }, 'Move "{{name}}" to trash?'))) return;
		try {
			if (kind === 'file') await deleteFile(id);
			else await deleteFolder(id);
			await load();
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	function openFile(file: FileItem) {
		window.open(fileInlineUrl(file.id), '_blank', 'noopener');
	}

	const isEmpty = $derived(listing.folders.length === 0 && listing.files.length === 0);
	const viewClass = $derived(
		filesStore.viewMode === 'grid' ? 'files-grid-view' : 'files-list-view'
	);

	// Reload whenever the route path changes.
	$effect(() => {
		// reference pathSegments so the effect re-runs on navigation
		void pathSegments;
		void load();
	});
</script>

<svelte:head><title>{t('nav.files', 'Files')} · OxiCloud</title></svelte:head>

<div
	class="files-page"
	class:dropzone-active={dragOver}
	role="region"
	aria-label={t('nav.files', 'Files')}
	ondragover={(e) => {
		e.preventDefault();
		dragOver = true;
	}}
	ondragleave={() => (dragOver = false)}
	ondrop={onDrop}
>
	<div class="page-sticky-header">
		<nav class="breadcrumb" aria-label="Breadcrumb">
			<a href="/files" class="breadcrumb-item">
				<Icon name="folder" />
				{session.homeFolderName ?? t('nav.files', 'Files')}
			</a>
			{#each crumbs as c, i (c.id)}
				<span class="breadcrumb-separator">/</span>
				<a href={crumbHref(i)} class="breadcrumb-item">{c.name}</a>
			{/each}
		</nav>

		<div class="actions-bar">
			<div class="action-buttons">
				<button class="btn btn-secondary" onclick={onNewFolder}>
					<Icon name="folder-plus" />
					{t('files.new_folder', 'New folder')}
				</button>
				<button class="btn btn-primary" onclick={() => fileInput?.click()} disabled={uploading}>
					<Icon name="arrow-up" />
					{uploading ? t('files.uploading', 'Uploading…') : t('files.upload', 'Upload')}
				</button>
				<input bind:this={fileInput} type="file" multiple hidden onchange={onUpload} />
			</div>

			<div class="view-toggle" role="group" aria-label="View mode">
				<button
					class="view-toggle-btn"
					class:active={filesStore.viewMode === 'grid'}
					aria-pressed={filesStore.viewMode === 'grid'}
					onclick={() => filesStore.setViewMode('grid')}
				>
					<Icon name="th" />
				</button>
				<button
					class="view-toggle-btn"
					class:active={filesStore.viewMode === 'list'}
					aria-pressed={filesStore.viewMode === 'list'}
					onclick={() => filesStore.setViewMode('list')}
				>
					<Icon name="list" />
				</button>
			</div>
		</div>
	</div>

	{#if error}
		<div class="empty-state"><p>{error}</p></div>
	{:else if loading && isEmpty}
		<div class="empty-state"><p>{t('common.loading', 'Loading…')}</p></div>
	{:else if isEmpty}
		<div class="empty-state">
			<p>{t('files.empty_title', 'This folder is empty')}</p>
			<p>{t('files.empty_hint', 'Drop files here or use the Upload button to add files.')}</p>
		</div>
	{:else}
		<div class="files-container">
			<div
				class={viewClass}
				style="--files-list-columns: minmax(200px, 2fr) 120px 110px 140px 110px"
			>
				<div class="list-header">
					<div>{t('files.col_name', 'Name')}</div>
					<div>{t('files.col_type', 'Type')}</div>
					<div>{t('files.col_size', 'Size')}</div>
					<div>{t('files.col_modified', 'Modified')}</div>
					<div></div>
				</div>

				{#each listing.folders as folder (folder.id)}
					<div
						class="file-item"
						role="button"
						tabindex="0"
						ondblclick={() => openFolder(folder)}
						onclick={() => openFolder(folder)}
						onkeydown={(e) => e.key === 'Enter' && openFolder(folder)}
					>
						<div class="name-cell">
							<span class="file-icon"><Icon name="folder" /></span>
							<span>{folder.name}</span>
						</div>
						<div class="type-cell">{t('files.folder', 'Folder')}</div>
						<div class="size-cell">—</div>
						<div class="date-cell">{formatDate(folder.modified_at)}</div>
						<div class="grid-meta"></div>
						<div class="action-cell">
							<button
								class="btn-action"
								title={t('common.rename', 'Rename')}
								onclick={(e) => {
									e.stopPropagation();
									renameItem('folder', folder.id, folder.name);
								}}><Icon name="pen" /></button
							>
							<button
								class="btn-action btn-action--delete"
								title={t('common.delete', 'Delete')}
								onclick={(e) => {
									e.stopPropagation();
									deleteItem('folder', folder.id, folder.name);
								}}><Icon name="trash" /></button
							>
						</div>
					</div>
				{/each}

				{#each listing.files as file (file.id)}
					<div
						class="file-item"
						role="button"
						tabindex="0"
						ondblclick={() => openFile(file)}
						onclick={() => openFile(file)}
						onkeydown={(e) => e.key === 'Enter' && openFile(file)}
					>
						<div class="name-cell">
							<span class="file-icon"><Icon name={iconNameFromClass(file.icon_class)} /></span>
							<span>{file.name}</span>
						</div>
						<div class="type-cell">{file.category || t('files.file', 'File')}</div>
						<div class="size-cell">{file.size != null ? formatBytes(file.size) : ''}</div>
						<div class="date-cell">{formatDate(file.modified_at)}</div>
						<div class="grid-meta">
							{#if file.size != null}<span class="grid-meta__size">{formatBytes(file.size)}</span
								>{/if}
						</div>
						<div class="action-cell">
							<a
								class="btn-action"
								href={fileDownloadUrl(file.id)}
								download
								title={t('common.download', 'Download')}
								onclick={(e) => e.stopPropagation()}><Icon name="download" /></a
							>
							<button
								class="btn-action"
								title={t('common.rename', 'Rename')}
								onclick={(e) => {
									e.stopPropagation();
									renameItem('file', file.id, file.name);
								}}><Icon name="pen" /></button
							>
							<button
								class="btn-action btn-action--delete"
								title={t('common.delete', 'Delete')}
								onclick={(e) => {
									e.stopPropagation();
									deleteItem('file', file.id, file.name);
								}}><Icon name="trash" /></button
							>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.files-page {
		min-height: 100%;
	}

	.files-page.dropzone-active {
		outline: 2px dashed var(--color-accent);
		outline-offset: -8px;
		border-radius: var(--radius-xl);
	}

	.page-sticky-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
		flex: none;
	}

	.view-toggle-btn {
		padding: var(--space-2) var(--space-3);
		border: none;
		background: var(--color-bg-surface);
		color: var(--color-text-muted);
		cursor: pointer;
	}

	.view-toggle-btn.active {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.action-cell {
		display: flex;
		gap: var(--space-1);
		justify-content: flex-end;
	}

	.btn-action--delete:hover {
		color: var(--color-danger-text);
	}

	.btn-action {
		text-decoration: none;
	}
</style>
