<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/icons/Icon.svelte';
	import { iconNameFromClass } from '$lib/utils/display';

	interface Props {
		name: string;
		iconClass?: string;
		subtitle?: string;
		date?: string;
		actions?: Snippet;
	}

	let { name, iconClass, subtitle, date, actions }: Props = $props();
</script>

<li class="row">
	<span class="row__icon"><Icon name={iconNameFromClass(iconClass)} /></span>
	<span class="row__main">
		<span class="row__name" title={name}>{name}</span>
		{#if subtitle}<span class="row__sub" title={subtitle}>{subtitle}</span>{/if}
	</span>
	{#if date}<span class="row__date">{date}</span>{/if}
	{#if actions}<span class="row__actions">{@render actions()}</span>{/if}
</li>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-radius: var(--radius-md);
	}

	.row:hover {
		background: var(--color-bg-hover);
	}

	.row__icon {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		flex: none;
	}

	.row__main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}

	.row__name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
	}

	.row__sub {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.row__date {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		flex: none;
	}

	.row__actions {
		display: flex;
		gap: 0.25rem;
		flex: none;
	}
</style>
