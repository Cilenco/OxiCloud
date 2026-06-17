<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		/** Called when the user requests close (backdrop click, Escape, ✕). */
		onclose?: () => void;
		children?: Snippet;
		footer?: Snippet;
	}

	let { open = $bindable(false), title, onclose, children, footer }: Props = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={open ? onkeydown : undefined} />

{#if open}
	<!-- backdrop -->
	<div
		class="modal__backdrop"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) close();
		}}
	>
		<div class="modal" role="dialog" aria-modal="true" aria-label={title}>
			{#if title}
				<header class="modal__header">
					<h2 class="modal__title">{title}</h2>
					<button class="modal__close" aria-label="Close" onclick={close}>×</button>
				</header>
			{/if}
			<div class="modal__body">
				{@render children?.()}
			</div>
			{#if footer}
				<footer class="modal__footer">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}

<style>
	.modal__backdrop {
		position: fixed;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 900;
		padding: 1rem;
	}

	.modal {
		background: var(--color-bg-surface);
		color: var(--color-text);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-xl);
		width: min(92vw, 32rem);
		max-height: 90vh;
		overflow: auto;
		display: flex;
		flex-direction: column;
	}

	.modal__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--color-border);
	}

	.modal__title {
		margin: 0;
		font-size: 1.125rem;
	}

	.modal__close {
		background: none;
		border: none;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.modal__body {
		padding: 1.25rem;
	}

	.modal__footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--color-border);
	}
</style>
