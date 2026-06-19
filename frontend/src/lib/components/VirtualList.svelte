<script lang="ts" module>
	/**
	 * Generic windowing list. Renders only the rows intersecting the nearest
	 * scrollable ancestor's viewport (plus an overscan margin), reserving the full
	 * scroll height with a sized spacer so the scrollbar, sticky headers and any
	 * end-of-list sentinel keep behaving exactly as with a fully-rendered list.
	 *
	 * Scroll-ancestor based (not its own scroll box) so it drops into the existing
	 * `.content-area` layout without changing the single-scrollbar UX. Row height
	 * is auto-measured for the single-column case; pass `rowHeight` as the estimate
	 * (and for multi-column grids, where it must be the row pitch incl. gap).
	 */
	export interface VirtualListProps<T> {
		items: T[];
		/** Row pitch in px (height incl. row gap). Auto-refined when columns === 1. */
		rowHeight?: number;
		/** Items per row; > 1 lays the window out as a grid. */
		columns?: number;
		/** Extra rows rendered above and below the viewport. */
		overscan?: number;
		/** Class applied to the inner window (e.g. the grid container class). */
		windowClass?: string;
		/** Inline style applied to the inner window (e.g. grid-template-columns). */
		windowStyle?: string;
		/** Stable key per item (defaults to the absolute index). */
		key?: (item: T, index: number) => string | number;
		row: import('svelte').Snippet<[T, number]>;
	}
</script>

<script lang="ts" generics="T">
	import { onMount } from 'svelte';

	let {
		items,
		rowHeight = 48,
		columns = 1,
		overscan = 6,
		windowClass = '',
		windowStyle = '',
		key,
		row
	}: VirtualListProps<T> = $props();

	let rootEl: HTMLDivElement;
	/** Measured row pitch in px; 0 until known, then refined from a real row. */
	let measuredRow = $state(0);
	let firstRow = $state(0);
	let lastRow = $state(0);

	const cols = $derived(Math.max(1, columns));
	const effRowH = $derived(measuredRow > 0 ? measuredRow : rowHeight);
	const rowCount = $derived(Math.ceil(items.length / cols));
	const totalHeight = $derived(rowCount * effRowH);
	const startIndex = $derived(firstRow * cols);
	const endIndex = $derived(Math.min(items.length, lastRow * cols));
	const offsetY = $derived(firstRow * effRowH);
	const visible = $derived(items.slice(startIndex, endIndex));

	let scroller: HTMLElement | null = null;

	/** Nearest scrollable ancestor, or null to mean the window/document. */
	function findScroller(el: HTMLElement): HTMLElement | null {
		let node = el.parentElement;
		while (node) {
			const oy = getComputedStyle(node).overflowY;
			if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return node;
			node = node.parentElement;
		}
		return null;
	}

	function viewportRect(): { top: number; height: number } {
		if (scroller) {
			const r = scroller.getBoundingClientRect();
			return { top: r.top, height: scroller.clientHeight };
		}
		return { top: 0, height: window.innerHeight };
	}

	function measure(): void {
		if (!rootEl) return;
		const { top: vTop, height: vH } = viewportRect();
		// How far the list's top has scrolled above the viewport top (px).
		const aboveBy = vTop - rootEl.getBoundingClientRect().top;
		const rh = effRowH || rowHeight;
		firstRow = Math.max(0, Math.floor(aboveBy / rh) - overscan);
		lastRow = Math.min(rowCount, Math.ceil((aboveBy + vH) / rh) + overscan);
	}

	let ticking = false;
	function onScroll(): void {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			ticking = false;
			measure();
		});
	}

	/** Single-column: adopt the real rendered row height once it's known. */
	function refineRowHeight(): void {
		if (cols !== 1 || !rootEl) return;
		const firstChild = rootEl.querySelector('.vlist__window > *') as HTMLElement | null;
		if (!firstChild) return;
		const h = firstChild.getBoundingClientRect().height;
		if (h > 0 && Math.abs(h - measuredRow) > 0.5) measuredRow = h;
	}

	onMount(() => {
		scroller = findScroller(rootEl);
		const target: EventTarget = scroller ?? window;
		target.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		const ro = new ResizeObserver(() => onScroll());
		if (scroller) ro.observe(scroller);
		ro.observe(rootEl);
		measure();
		requestAnimationFrame(() => {
			refineRowHeight();
			measure();
		});
		return () => {
			target.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			ro.disconnect();
		};
	});

	// Re-window when the dataset size or column count changes (load-more, reload,
	// viewport breakpoint). `effRowH` is read so a refined height re-runs it too.
	$effect(() => {
		void items.length;
		void cols;
		void effRowH;
		measure();
	});

	// Refine the measured row height once rows are actually in the DOM.
	$effect(() => {
		void visible.length;
		refineRowHeight();
	});
</script>

<div bind:this={rootEl} class="vlist" style:height="{totalHeight}px">
	<div
		class="vlist__window {windowClass}"
		style="transform: translateY({offsetY}px); {windowStyle}"
	>
		{#each visible as item, i (key ? key(item, startIndex + i) : startIndex + i)}
			{@render row(item, startIndex + i)}
		{/each}
	</div>
</div>

<style>
	.vlist {
		position: relative;
		width: 100%;
	}

	.vlist__window {
		position: absolute;
		inset: 0 0 auto;
		will-change: transform;
	}
</style>
