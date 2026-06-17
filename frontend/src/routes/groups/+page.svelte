<script lang="ts">
	import { onMount } from 'svelte';
	import {
		addUserMember,
		createGroup,
		deleteGroup,
		listGroups,
		listMembers,
		removeGroupMember,
		removeUserMember,
		renameGroup,
		type GroupItem,
		type GroupMember
	} from '$lib/api/endpoints/groups';
	import { t } from '$lib/i18n/index.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let groups = $state<GroupItem[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let expandedId = $state<string | null>(null);
	let members = $state<GroupMember[]>([]);

	async function load() {
		loading = true;
		error = null;
		try {
			groups = await listGroups();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function report(e: unknown) {
		ui.notify(e instanceof Error ? e.message : String(e), 'error');
	}

	async function expand(g: GroupItem) {
		if (expandedId === g.id) {
			expandedId = null;
			return;
		}
		expandedId = g.id;
		try {
			members = await listMembers(g.id);
		} catch (e) {
			report(e);
			members = [];
		}
	}

	async function onCreate() {
		const name = prompt(t('groups.new_prompt', 'New group name'));
		if (!name) return;
		try {
			await createGroup(name);
			await load();
		} catch (e) {
			report(e);
		}
	}

	async function onRename(g: GroupItem) {
		const name = prompt(t('groups.rename_prompt', 'New name'), g.name);
		if (!name || name === g.name) return;
		try {
			await renameGroup(g.id, name);
			await load();
		} catch (e) {
			report(e);
		}
	}

	async function onDelete(g: GroupItem) {
		if (!confirm(t('groups.confirm_delete', { name: g.name }, 'Delete group "{{name}}"?'))) return;
		try {
			await deleteGroup(g.id);
			if (expandedId === g.id) expandedId = null;
			await load();
		} catch (e) {
			report(e);
		}
	}

	async function onAddMember(g: GroupItem) {
		const userId = prompt(t('groups.add_member_prompt', 'User ID to add'));
		if (!userId) return;
		try {
			await addUserMember(g.id, userId);
			members = await listMembers(g.id);
		} catch (e) {
			report(e);
		}
	}

	async function onRemoveMember(groupId: string, m: GroupMember) {
		try {
			if (m.user_id) await removeUserMember(groupId, m.user_id);
			else if (m.group_id) await removeGroupMember(groupId, m.group_id);
			members = await listMembers(groupId);
		} catch (e) {
			report(e);
		}
	}

	onMount(load);
</script>

<svelte:head><title>{t('nav.groups', 'Groups')} · OxiCloud</title></svelte:head>

<main class="groups">
	<header class="groups__head">
		<h1>{t('nav.groups', 'Groups')}</h1>
		<button class="btn btn--primary" onclick={onCreate}>{t('groups.create', 'Create group')}</button
		>
	</header>

	{#if error}
		<p class="status status--error">{error}</p>
	{:else if loading}
		<p class="status">{t('common.loading', 'Loading…')}</p>
	{:else if groups.length === 0}
		<p class="status">{t('groups.empty', 'No groups yet.')}</p>
	{:else}
		<ul class="list">
			{#each groups as g (g.id)}
				<li class="group">
					<div class="group__row">
						<button class="group__name" onclick={() => expand(g)}>
							{g.name}
							{#if g.member_count != null}<span class="muted">({g.member_count})</span>{/if}
						</button>
						<div class="group__actions">
							<button class="link-btn" onclick={() => onRename(g)}
								>{t('common.rename', 'Rename')}</button
							>
							<button class="link-btn link-btn--danger" onclick={() => onDelete(g)}>
								{t('common.delete', 'Delete')}
							</button>
						</div>
					</div>

					{#if expandedId === g.id}
						<div class="members">
							<div class="members__head">
								<h2>{t('groups.members', 'Members')}</h2>
								<button class="link-btn" onclick={() => onAddMember(g)}>
									{t('groups.add_member', 'Add member')}
								</button>
							</div>
							{#if members.length === 0}
								<p class="muted">{t('groups.no_members', 'No members.')}</p>
							{:else}
								<ul class="members__list">
									{#each members as m (m.user_id ?? m.group_id)}
										<li>
											<span>{m.email ?? m.name ?? m.user_id ?? m.group_id}</span>
											<button
												class="link-btn link-btn--danger"
												onclick={() => onRemoveMember(g.id, m)}
											>
												{t('common.remove', 'Remove')}
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.groups {
		max-width: 48rem;
		margin: 0 auto;
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.groups__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.groups__head h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.group {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-bg-surface);
	}

	.group__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
	}

	.group__name {
		background: none;
		border: none;
		color: var(--color-text);
		cursor: pointer;
		font-size: 1rem;
	}

	.group__actions {
		display: flex;
		gap: 0.5rem;
	}

	.members {
		border-top: 1px solid var(--color-border);
		padding: 0.75rem;
	}

	.members__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.members__head h2 {
		margin: 0;
		font-size: 1rem;
	}

	.members__list {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.members__list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.muted {
		color: var(--color-text-muted);
		font-size: 0.8125rem;
	}

	.status {
		color: var(--color-text-muted);
		padding: 2rem 0;
		text-align: center;
	}

	.status--error {
		color: var(--color-danger-text);
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
