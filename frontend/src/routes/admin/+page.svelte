<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createUser,
		deletePlugin,
		deleteUser,
		listPlugins,
		listUsers,
		resetUserPassword,
		setPluginEnabled,
		setUserActive,
		setUserQuota,
		setUserRole,
		type PluginInfo
	} from '$lib/api/endpoints/admin';
	import type { User } from '$lib/api/types';
	import Modal from '$lib/components/Modal.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { formatBytes } from '$lib/utils/format';

	const PAGE_SIZE = 25;

	let tab = $state<'users' | 'plugins'>('users');

	// Users
	let users = $state<User[]>([]);
	let total = $state(0);
	let pageIndex = $state(0);
	let usersError = $state<string | null>(null);
	let createOpen = $state(false);
	let newUser = $state({ username: '', email: '', password: '', role: 'user', quotaGb: 5 });

	// Plugins
	let plugins = $state<PluginInfo[]>([]);
	let pluginsAvailable = $state(true);
	let pluginsError = $state<string | null>(null);

	async function loadUsers() {
		usersError = null;
		try {
			const page = await listUsers(PAGE_SIZE, pageIndex * PAGE_SIZE);
			users = page.users;
			total = page.total;
		} catch (e) {
			usersError = e instanceof Error ? e.message : String(e);
		}
	}

	async function loadPlugins() {
		pluginsError = null;
		try {
			const res = await listPlugins();
			pluginsAvailable = res.available;
			plugins = res.plugins;
		} catch (e) {
			pluginsError = e instanceof Error ? e.message : String(e);
		}
	}

	function reportError(e: unknown) {
		ui.notify(e instanceof Error ? e.message : String(e), 'error');
	}

	async function toggleRole(u: User) {
		const role = u.role === 'admin' ? 'user' : 'admin';
		if (!confirm(t('admin.confirm_role', { role }, 'Change role to {{role}}?'))) return;
		try {
			await setUserRole(u.id, role);
			await loadUsers();
		} catch (e) {
			reportError(e);
		}
	}

	async function toggleActive(u: User) {
		try {
			await setUserActive(u.id, !u.active);
			await loadUsers();
		} catch (e) {
			reportError(e);
		}
	}

	async function changeQuota(u: User) {
		const gb = prompt(t('admin.quota_prompt', 'Quota in GB (0 = unlimited)'));
		if (gb === null) return;
		try {
			await setUserQuota(u.id, Math.round(Number(gb) * 1024 ** 3));
			await loadUsers();
		} catch (e) {
			reportError(e);
		}
	}

	async function resetPw(u: User) {
		const pw = prompt(t('admin.new_password_prompt', 'New password'));
		if (!pw) return;
		try {
			await resetUserPassword(u.id, pw);
			ui.notify(t('admin.password_reset', 'Password reset'), 'success');
		} catch (e) {
			reportError(e);
		}
	}

	async function removeUser(u: User) {
		if (!confirm(t('admin.confirm_delete_user', { name: u.email }, 'Delete user {{name}}?')))
			return;
		try {
			await deleteUser(u.id);
			await loadUsers();
		} catch (e) {
			reportError(e);
		}
	}

	async function submitCreate(e: SubmitEvent) {
		e.preventDefault();
		try {
			await createUser({
				username: newUser.username,
				email: newUser.email,
				password: newUser.password,
				role: newUser.role,
				quota_bytes: Math.round(newUser.quotaGb * 1024 ** 3)
			});
			createOpen = false;
			newUser = { username: '', email: '', password: '', role: 'user', quotaGb: 5 };
			await loadUsers();
		} catch (err) {
			reportError(err);
		}
	}

	async function togglePlugin(p: PluginInfo) {
		try {
			await setPluginEnabled(p.id, !p.enabled);
			await loadPlugins();
		} catch (e) {
			reportError(e);
		}
	}

	async function removePlugin(p: PluginInfo) {
		if (!confirm(t('admin.confirm_delete_plugin', { name: p.name }, 'Delete plugin {{name}}?')))
			return;
		try {
			await deletePlugin(p.id);
			await loadPlugins();
		} catch (e) {
			reportError(e);
		}
	}

	function changePage(delta: number) {
		const next = pageIndex + delta;
		if (next < 0 || next * PAGE_SIZE >= total) return;
		pageIndex = next;
		void loadUsers();
	}

	onMount(() => {
		void loadUsers();
		void loadPlugins();
	});
</script>

<svelte:head><title>{t('admin.title', 'Admin')} · OxiCloud</title></svelte:head>

<main class="admin">
	<h1>{t('admin.title', 'Admin')}</h1>

	<div class="tabs" role="tablist">
		<button role="tab" aria-selected={tab === 'users'} onclick={() => (tab = 'users')}>
			{t('admin.users', 'Users')}
		</button>
		<button role="tab" aria-selected={tab === 'plugins'} onclick={() => (tab = 'plugins')}>
			{t('admin.plugins', 'Plugins')}
		</button>
	</div>

	{#if tab === 'users'}
		<div class="bar">
			<button class="btn btn--primary" onclick={() => (createOpen = true)}>
				{t('admin.create_user', 'Create user')}
			</button>
		</div>
		{#if usersError}
			<p class="status status--error">{usersError}</p>
		{:else}
			<table class="table">
				<thead>
					<tr>
						<th>{t('admin.user', 'User')}</th>
						<th>{t('admin.role', 'Role')}</th>
						<th>{t('admin.status', 'Status')}</th>
						<th>{t('admin.quota', 'Quota')}</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each users as u (u.id)}
						<tr>
							<td>
								<div class="user-cell">
									<strong>{u.username || u.email}</strong>
									<span class="muted">{u.email}</span>
								</div>
							</td>
							<td>{u.role}</td>
							<td>{u.active ? t('admin.active', 'Active') : t('admin.inactive', 'Inactive')}</td>
							<td>
								{u.storage_quota_bytes > 0 ? formatBytes(u.storage_quota_bytes) : '∞'}
							</td>
							<td class="actions">
								<button class="link-btn" onclick={() => toggleRole(u)}
									>{t('admin.role', 'Role')}</button
								>
								<button class="link-btn" onclick={() => toggleActive(u)}>
									{u.active ? t('admin.deactivate', 'Deactivate') : t('admin.activate', 'Activate')}
								</button>
								<button class="link-btn" onclick={() => changeQuota(u)}
									>{t('admin.quota', 'Quota')}</button
								>
								<button class="link-btn" onclick={() => resetPw(u)}
									>{t('admin.reset_pw', 'Reset pw')}</button
								>
								<button class="link-btn link-btn--danger" onclick={() => removeUser(u)}>
									{t('common.delete', 'Delete')}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<div class="pager">
				<button class="btn" disabled={pageIndex === 0} onclick={() => changePage(-1)}>‹</button>
				<span>{pageIndex + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
				<button
					class="btn"
					disabled={(pageIndex + 1) * PAGE_SIZE >= total}
					onclick={() => changePage(1)}>›</button
				>
			</div>
		{/if}
	{:else if !pluginsAvailable}
		<p class="status">{t('admin.plugins_disabled', 'The plugin subsystem is disabled.')}</p>
	{:else if pluginsError}
		<p class="status status--error">{pluginsError}</p>
	{:else if plugins.length === 0}
		<p class="status">{t('admin.no_plugins', 'No plugins installed.')}</p>
	{:else}
		<table class="table">
			<thead>
				<tr>
					<th>{t('admin.plugin', 'Plugin')}</th>
					<th>{t('admin.version', 'Version')}</th>
					<th>{t('admin.status', 'Status')}</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each plugins as p (p.id)}
					<tr>
						<td>
							<div class="user-cell">
								<strong>{p.name}</strong>
								{#if p.description}<span class="muted">{p.description}</span>{/if}
							</div>
						</td>
						<td>{p.version ?? '—'}</td>
						<td>{p.enabled ? t('admin.enabled', 'Enabled') : t('admin.disabled', 'Disabled')}</td>
						<td class="actions">
							<button class="link-btn" onclick={() => togglePlugin(p)}>
								{p.enabled ? t('admin.disable', 'Disable') : t('admin.enable', 'Enable')}
							</button>
							<button class="link-btn link-btn--danger" onclick={() => removePlugin(p)}>
								{t('common.delete', 'Delete')}
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</main>

<Modal bind:open={createOpen} title={t('admin.create_user', 'Create user')}>
	<form id="create-user-form" onsubmit={submitCreate} class="form">
		<label
			><span>{t('admin.username', 'Username')}</span>
			<input bind:value={newUser.username} required /></label
		>
		<label
			><span>{t('admin.email', 'Email')}</span>
			<input type="email" bind:value={newUser.email} required /></label
		>
		<label
			><span>{t('admin.password', 'Password')}</span>
			<input type="password" bind:value={newUser.password} required /></label
		>
		<label
			><span>{t('admin.role', 'Role')}</span>
			<select bind:value={newUser.role}>
				<option value="user">user</option>
				<option value="admin">admin</option>
			</select></label
		>
		<label
			><span>{t('admin.quota_gb', 'Quota (GB)')}</span>
			<input type="number" min="0" bind:value={newUser.quotaGb} /></label
		>
	</form>
	{#snippet footer()}
		<button class="btn" onclick={() => (createOpen = false)}>{t('common.cancel', 'Cancel')}</button>
		<button class="btn btn--primary" type="submit" form="create-user-form">
			{t('common.create', 'Create')}
		</button>
	{/snippet}
</Modal>

<style>
	.admin {
		max-width: 64rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--color-border);
	}

	.tabs button {
		padding: 0.5rem 1rem;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		border-bottom: 2px solid transparent;
	}

	.tabs button[aria-selected='true'] {
		color: var(--color-text);
		border-bottom-color: var(--color-primary);
	}

	.bar {
		display: flex;
		justify-content: flex-end;
	}

	.table {
		width: 100%;
		border-collapse: collapse;
	}

	.table th,
	.table td {
		text-align: left;
		padding: 0.5rem 0.625rem;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.875rem;
	}

	.user-cell {
		display: flex;
		flex-direction: column;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pager {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.form label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.875rem;
	}

	.form input,
	.form select {
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-input);
		color: var(--color-text);
	}

	.btn {
		padding: 0.5rem 0.875rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	.btn--primary {
		background: var(--color-primary);
		color: var(--color-text-light);
		border-color: transparent;
	}

	.status {
		color: var(--color-text-muted);
		padding: 2rem 0;
		text-align: center;
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
</style>
