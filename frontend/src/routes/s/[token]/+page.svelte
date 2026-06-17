<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import {
		getShareContents,
		getShareMeta,
		shareDownloadUrl,
		shareFileUrl,
		shareZipUrl,
		verifySharePassword,
		type ShareListing,
		type ShareMeta
	} from '$lib/api/endpoints/share';
	import { t } from '$lib/i18n/index.svelte';

	type State = 'loading' | 'password' | 'expired' | 'file' | 'folder';

	const token = $derived(page.params.token ?? '');

	let view = $state<State>('loading');
	let meta = $state<ShareMeta | null>(null);
	let listing = $state<ShareListing | null>(null);
	let folderId = $state<string | undefined>(undefined);
	let folderName = $state<string>('');
	let pwInput = $state('');
	let pwError = $state('');
	let busy = $state(false);

	async function loadMeta() {
		view = 'loading';
		try {
			const r = await getShareMeta(token);
			if (r.status === 'password') {
				view = 'password';
			} else if (r.status === 'expired') {
				view = 'expired';
			} else {
				meta = r.data;
				if (r.data.item_type === 'folder') await openFolder(undefined, r.data.item_name);
				else view = 'file';
			}
		} catch {
			view = 'expired';
		}
	}

	async function openFolder(id: string | undefined, name: string) {
		const r = await getShareContents(token, id);
		if (r.status === 'password') {
			view = 'password';
			return;
		}
		if (r.status === 'expired') {
			view = 'expired';
			return;
		}
		listing = r.data;
		folderId = id;
		folderName = name;
		view = 'folder';
	}

	async function submitPassword(e: SubmitEvent) {
		e.preventDefault();
		if (!pwInput) return;
		busy = true;
		pwError = '';
		try {
			const ok = await verifySharePassword(token, pwInput);
			if (!ok) {
				pwError = t('share.bad_password', 'Incorrect password. Please try again.');
				return;
			}
			await loadMeta();
		} catch {
			pwError = t('share.error', 'Something went wrong. Please try again.');
		} finally {
			busy = false;
		}
	}

	onMount(loadMeta);
</script>

<svelte:head><title>{meta?.item_name ?? t('share.title', 'Shared')} · OxiCloud</title></svelte:head>

<main class="share">
	{#if view === 'loading'}
		<p class="share__status">{t('common.loading', 'Loading…')}</p>
	{:else if view === 'expired'}
		<div class="share__center">
			<Icon name="ban" class="share__big-icon" />
			<p>{t('share.expired', 'This share link is no longer available.')}</p>
		</div>
	{:else if view === 'password'}
		<form class="share__pw" onsubmit={submitPassword}>
			<h1>{t('share.password_title', 'Password required')}</h1>
			<input
				type="password"
				bind:value={pwInput}
				placeholder={t('share.password', 'Password')}
				disabled={busy}
				autocomplete="off"
			/>
			{#if pwError}<p class="share__error" role="alert">{pwError}</p>{/if}
			<button type="submit" disabled={busy}>{t('share.unlock', 'Unlock')}</button>
		</form>
	{:else if view === 'file'}
		<div class="share__center">
			<Icon name="file" class="share__big-icon" />
			<h1>{meta?.item_name}</h1>
			<a class="share__btn" href={shareDownloadUrl(token)} download>
				{t('share.download', 'Download')}
			</a>
		</div>
	{:else if view === 'folder' && listing}
		<header class="share__header">
			<h1>{folderName}</h1>
			<div class="share__header-actions">
				{#if folderId}
					<button class="link-btn" onclick={() => openFolder(undefined, meta?.item_name ?? '')}>
						← {t('share.back_to_root', 'Back to share root')}
					</button>
				{/if}
				<a class="share__btn" href={shareZipUrl(token, folderId)} download>
					{t('share.download_zip', 'Download ZIP')}
				</a>
			</div>
		</header>

		{#if listing.folders.length === 0 && listing.files.length === 0}
			<p class="share__status">{t('share.empty_folder', 'This folder is empty.')}</p>
		{/if}

		{#if listing.folders.length > 0}
			<h2 class="share__section">{t('share.folders', 'Folders')}</h2>
			<ul class="share__grid">
				{#each listing.folders as f (f.id)}
					<li>
						<button class="card" onclick={() => openFolder(f.id, f.name)}>
							<Icon name="folder" class="card__icon" />
							<span class="card__name">{f.name}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}

		{#if listing.files.length > 0}
			<h2 class="share__section">{t('share.files', 'Files')}</h2>
			<ul class="share__grid">
				{#each listing.files as f (f.id)}
					<li>
						<a class="card" href={shareFileUrl(token, f.id)} target="_blank" rel="noreferrer">
							<Icon name="file" class="card__icon" />
							<span class="card__name">{f.name}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</main>

<style>
	.share {
		max-width: 60rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.share__center {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem 0;
		text-align: center;
	}

	:global(.share__big-icon) {
		font-size: 3rem;
		color: var(--color-text-muted);
	}

	.share__status {
		text-align: center;
		color: var(--color-text-muted);
		padding: 3rem 0;
	}

	.share__pw {
		max-width: 22rem;
		margin: 4rem auto;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.share__pw input {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
	}

	.share__error {
		color: var(--color-danger-text);
		font-size: 0.875rem;
		margin: 0;
	}

	.share__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.share__header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.share__section {
		font-size: 1rem;
		color: var(--color-text-muted);
		margin: 1.5rem 0 0.5rem;
	}

	.share__grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
		gap: 0.75rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 1rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-text);
		cursor: pointer;
		text-decoration: none;
	}

	.card:hover {
		background: var(--color-bg-hover);
	}

	:global(.card__icon) {
		font-size: 2rem;
		color: var(--color-text-muted);
	}

	.card__name {
		font-size: 0.8125rem;
		text-align: center;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	.share__btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text-light);
		text-decoration: none;
		cursor: pointer;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
	}
</style>
