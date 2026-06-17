<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { logout } from '$lib/api/endpoints/auth';
	import Icon from '$lib/icons/Icon.svelte';
	import { i18n, SUPPORTED_LOCALES, setLocale, t, type Locale } from '$lib/i18n/index.svelte';
	import { session } from '$lib/stores/session.svelte';
	import { theme, type Theme } from '$lib/stores/theme.svelte';
	import { formatBytes } from '$lib/utils/format';

	let { children }: { children: Snippet } = $props();

	interface NavLink {
		href: string;
		label: string;
		icon: string;
		admin?: boolean;
	}

	const LINKS: NavLink[] = [
		{ href: '/files', label: t('nav.files', 'Files'), icon: 'folder' },
		{ href: '/shared', label: t('nav.shared', 'Shared'), icon: 'globe' },
		{
			href: '/shared-with-me',
			label: t('nav.shared_with_me', 'Shared with me'),
			icon: 'user-group'
		},
		{ href: '/recent', label: t('nav.recent', 'Recent'), icon: 'clock' },
		{ href: '/favorites', label: t('nav.favorites', 'Favorites'), icon: 'star' },
		{ href: '/photos', label: t('nav.photos', 'Photos'), icon: 'images' },
		{ href: '/music', label: t('nav.music', 'Music'), icon: 'music' },
		{ href: '/trash', label: t('nav.trash', 'Trash'), icon: 'trash' },
		{ href: '/groups', label: t('nav.groups', 'Groups'), icon: 'users', admin: true },
		{ href: '/admin', label: t('admin.title', 'Admin'), icon: 'cog', admin: true }
	];

	const isAdmin = $derived(session.user?.role === 'admin');
	const visibleLinks = $derived(LINKS.filter((l) => !l.admin || isAdmin));

	function active(href: string): boolean {
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
	}

	let sidebarOpen = $state(false);

	const THEMES: Theme[] = ['light', 'auto', 'dark'];

	const storagePct = $derived(
		session.user && session.user.storage_quota_bytes > 0
			? Math.min(100, (session.user.storage_used_bytes / session.user.storage_quota_bytes) * 100)
			: 0
	);

	async function onLogout() {
		try {
			await logout();
		} catch {
			/* clear locally regardless */
		}
		session.reset();
		await goto('/login');
	}
</script>

<div
	class="sidebar-overlay"
	class:active={sidebarOpen}
	onclick={() => (sidebarOpen = false)}
	role="presentation"
></div>

<div class="sidebar" class:open={sidebarOpen}>
	<a href="/files" class="logo-container">
		<div class="logo">
			<svg viewBox="120 120 280 280" aria-hidden="true">
				<path
					d="M345 310c32 0 58-26 58-58s-26-58-58-58c-6.2 0-12 0.9-17.5 2.7C318 166 289 143 255 143c-34.3 0-63.1 22.6-73 53.7C176.9 195.7 171 195 165 195c-32 0-58 26-58 58s26 58 58 58h180z"
				/>
			</svg>
		</div>
		<div class="app-name">OxiCloud</div>
	</a>

	<nav class="nav-menu" aria-label={t('nav.primary', 'Primary')}>
		{#each visibleLinks as link (link.href)}
			<a
				class="nav-item"
				class:active={active(link.href)}
				href={link.href}
				onclick={() => (sidebarOpen = false)}
			>
				<Icon name={link.icon} />
				<span>{link.label}</span>
			</a>
		{/each}
	</nav>

	{#if session.user}
		<div class="storage-container">
			<div class="storage-title">
				<Icon name="database" /> <span>{t('storage.title', 'Storage')}</span>
			</div>
			<div class="storage-bar">
				<div class="storage-fill" style:width="{storagePct}%"></div>
			</div>
			<div class="storage-info">
				{#if session.user.storage_quota_bytes > 0}
					{formatBytes(session.user.storage_used_bytes)} / {formatBytes(
						session.user.storage_quota_bytes
					)}
				{:else}
					{formatBytes(session.user.storage_used_bytes)} {t('storage.used', 'used')}
				{/if}
			</div>
		</div>
	{/if}
</div>

<div class="main-content">
	<div class="top-bar">
		<button
			class="sidebar-toggle"
			aria-label="Toggle navigation menu"
			aria-expanded={sidebarOpen}
			onclick={() => (sidebarOpen = !sidebarOpen)}
		>
			<Icon name="bars" />
		</button>

		<div class="user-controls">
			<div class="seg" role="group" aria-label={t('settings.theme', 'Theme')}>
				{#each THEMES as th (th)}
					<button
						class="seg__btn"
						aria-pressed={theme.current === th}
						onclick={() => theme.set(th)}
					>
						{#if th === 'light'}<Icon name="sun" />{:else if th === 'dark'}<Icon
								name="moon"
							/>{:else}A{/if}
					</button>
				{/each}
			</div>

			<select
				class="locale-select"
				aria-label={t('settings.language', 'Language')}
				value={i18n.locale}
				onchange={(e) => setLocale(e.currentTarget.value as Locale)}
			>
				{#each SUPPORTED_LOCALES as loc (loc)}
					<option value={loc}>{loc}</option>
				{/each}
			</select>

			{#if session.user}
				<span class="user-name" title={session.user.email}>
					<Icon name="user" />
					{session.user.username || session.user.email}
				</span>
				<button class="logout" onclick={onLogout}>{t('nav.logout', 'Log out')}</button>
			{/if}
		</div>
	</div>

	<div class="content-area">
		{@render children()}
	</div>
</div>

<style>
	/* The app shell relies on the global layout CSS (sidebar/topbar/content);
	   these scoped rules cover only the controls unique to the rewrite. */
	:global(body) {
		display: flex;
	}

	.user-controls {
		margin-left: auto;
	}

	.seg {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.seg__btn {
		padding: 0.3rem 0.5rem;
		border: none;
		background: var(--color-bg-surface);
		color: var(--color-text-muted);
		cursor: pointer;
		min-width: 2rem;
	}

	.seg__btn[aria-pressed='true'] {
		background: var(--color-accent);
		color: var(--color-on-accent);
	}

	.locale-select {
		padding: 0.3rem 0.4rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
	}

	.user-name {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		max-width: 12rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.logout {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		color: var(--color-text);
		cursor: pointer;
	}
</style>
