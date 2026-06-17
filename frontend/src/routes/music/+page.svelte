<script lang="ts">
	import { onMount } from 'svelte';
	import { fileInlineUrl } from '$lib/api/endpoints/files';
	import {
		createPlaylist,
		deletePlaylist,
		listPlaylists,
		listTracks,
		removeTrack,
		reorderTracks,
		type Playlist,
		type PlaylistItem
	} from '$lib/api/endpoints/music';
	import Icon from '$lib/icons/Icon.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let playlists = $state<Playlist[]>([]);
	let current = $state<Playlist | null>(null);
	let tracks = $state<PlaylistItem[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let nowPlaying = $state<string | null>(null);

	// native HTML5 drag-reorder state
	let dragIndex = $state<number | null>(null);

	async function loadPlaylists() {
		loading = true;
		error = null;
		try {
			playlists = await listPlaylists();
			if (!current && playlists.length > 0) await select(playlists[0]);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function select(p: Playlist) {
		current = p;
		try {
			tracks = await listTracks(p.id);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function onCreate() {
		const name = prompt(t('music.new_playlist', 'New playlist name'));
		if (!name) return;
		try {
			const p = await createPlaylist(name);
			playlists = [...playlists, p];
			await select(p);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function onDelete(p: Playlist) {
		if (!confirm(t('music.confirm_delete', { name: p.name }, 'Delete playlist "{{name}}"?')))
			return;
		try {
			await deletePlaylist(p.id);
			playlists = playlists.filter((x) => x.id !== p.id);
			if (current?.id === p.id) {
				current = playlists[0] ?? null;
				tracks = current ? await listTracks(current.id) : [];
			}
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	async function onRemoveTrack(track: PlaylistItem) {
		if (!current) return;
		try {
			await removeTrack(current.id, track.file_id);
			tracks = tracks.filter((x) => x.id !== track.id);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
		}
	}

	function onDragStart(i: number) {
		dragIndex = i;
	}

	function onDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === i) return;
		const next = [...tracks];
		const [moved] = next.splice(dragIndex, 1);
		next.splice(i, 0, moved);
		dragIndex = i;
		tracks = next;
	}

	async function onDrop() {
		dragIndex = null;
		if (!current) return;
		try {
			await reorderTracks(
				current.id,
				tracks.map((tr) => tr.id)
			);
		} catch (e) {
			ui.notify(e instanceof Error ? e.message : String(e), 'error');
			await select(current); // reload server order on failure
		}
	}

	function trackLabel(tr: PlaylistItem): string {
		return tr.title || tr.file_name || tr.file_id;
	}

	onMount(loadPlaylists);
</script>

<svelte:head><title>{t('nav.music', 'Music')} · OxiCloud</title></svelte:head>

<div class="music">
	<aside class="music__sidebar">
		<div class="music__sidebar-head">
			<h1>{t('nav.music', 'Music')}</h1>
			<button class="link-btn" onclick={onCreate}>+ {t('music.new', 'New')}</button>
		</div>
		{#if error}
			<p class="status status--error">{error}</p>
		{:else if loading && playlists.length === 0}
			<p class="status">{t('common.loading', 'Loading…')}</p>
		{:else if playlists.length === 0}
			<p class="status">{t('music.no_playlists', 'No playlists yet.')}</p>
		{:else}
			<ul class="playlists">
				{#each playlists as p (p.id)}
					<li>
						<button
							class="playlists__item"
							class:playlists__item--active={current?.id === p.id}
							onclick={() => select(p)}
						>
							<Icon name="music" class="playlists__icon" />
							<span class="playlists__name">{p.name}</span>
							<span class="playlists__count">{p.track_count}</span>
						</button>
						<button
							class="link-btn link-btn--danger"
							aria-label={t('common.delete', 'Delete')}
							onclick={() => onDelete(p)}>×</button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</aside>

	<section class="music__main">
		{#if current}
			<header class="music__main-head">
				<h2>{current.name}</h2>
			</header>
			{#if tracks.length === 0}
				<p class="status">{t('music.empty_playlist', 'This playlist has no tracks yet.')}</p>
			{:else}
				<ul class="tracks">
					{#each tracks as track, i (track.id)}
						<li
							class="track"
							draggable="true"
							ondragstart={() => onDragStart(i)}
							ondragover={(e) => onDragOver(e, i)}
							ondrop={onDrop}
							ondragend={() => (dragIndex = null)}
						>
							<span class="track__grip" aria-hidden="true"><Icon name="bars" /></span>
							<button class="track__play" onclick={() => (nowPlaying = track.file_id)}>
								<Icon name={nowPlaying === track.file_id ? 'pause' : 'play'} />
							</button>
							<span class="track__title">{trackLabel(track)}</span>
							{#if track.artist}<span class="track__artist">{track.artist}</span>{/if}
							<button class="link-btn link-btn--danger" onclick={() => onRemoveTrack(track)}>
								{t('common.remove', 'Remove')}
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if nowPlaying}
				<audio class="music__player" src={fileInlineUrl(nowPlaying)} controls autoplay></audio>
			{/if}
		{:else}
			<p class="status">{t('music.select_playlist', 'Select a playlist.')}</p>
		{/if}
	</section>
</div>

<style>
	.music {
		display: grid;
		grid-template-columns: 16rem 1fr;
		min-height: 100vh;
	}

	.music__sidebar {
		border-right: 1px solid var(--color-border);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.music__sidebar-head,
	.music__main-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.music__sidebar-head h1 {
		font-size: 1.25rem;
		margin: 0;
	}

	.playlists {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.playlists li {
		display: flex;
		align-items: center;
	}

	.playlists__item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
		padding: 0.5rem;
		border: none;
		background: none;
		color: var(--color-text);
		cursor: pointer;
		border-radius: var(--radius-md);
		text-align: left;
	}

	.playlists__item:hover {
		background: var(--color-bg-hover);
	}

	.playlists__item--active {
		background: var(--color-bg-hover);
		font-weight: 600;
	}

	.playlists__name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.playlists__count {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.music__main {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.tracks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.track {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
	}

	.track__grip {
		cursor: grab;
		color: var(--color-text-muted);
	}

	.track__play {
		border: none;
		background: none;
		cursor: pointer;
		color: var(--color-primary);
	}

	.track__title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.track__artist {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.music__player {
		position: sticky;
		bottom: 0;
		width: 100%;
	}

	.status {
		color: var(--color-text-muted);
		padding: 1rem 0;
	}

	.status--error {
		color: var(--color-danger-text);
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.8125rem;
	}

	.link-btn--danger {
		color: var(--color-danger-text);
	}

	@media (width <= 48rem) {
		.music {
			grid-template-columns: 1fr;
		}
	}
</style>
