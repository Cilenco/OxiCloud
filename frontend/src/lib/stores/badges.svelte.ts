/**
 * Session-scoped favorite / outgoing-share badge sets.
 *
 * The files browser shows a star (favorite) and a link (shared) badge per row.
 * Previously every folder navigation re-fetched the first 200 favorites AND the
 * first 200 shares — two round-trips per navigation, for data that barely
 * changes. This caches both id sets once per session (`ensureLoaded`, deduped)
 * and keeps them in sync via optimistic mutations from the views that toggle
 * them, so navigating folders costs zero extra requests.
 *
 * (The 200-item ceiling is inherited from the previous implementation; the truly
 * complete fix is to have the listing endpoint return per-item flags, a backend
 * change tracked separately.)
 */
import { fetchFavoritesPage } from '$lib/api/endpoints/favorites';
import { fetchMyShares } from '$lib/api/endpoints/grants';

class BadgesStore {
	#favorites = $state<Set<string>>(new Set());
	#shared = $state<Set<string>>(new Set());
	#loaded = false;
	#inflight: Promise<void> | null = null;

	isFavorite(id: string): boolean {
		return this.#favorites.has(id);
	}

	isShared(id: string): boolean {
		return this.#shared.has(id);
	}

	/** Load both id sets once per session. Concurrent callers share one fetch. */
	ensureLoaded(): Promise<void> {
		if (this.#loaded) return Promise.resolve();
		if (this.#inflight) return this.#inflight;
		this.#inflight = (async () => {
			const [favs, shares] = await Promise.all([
				fetchFavoritesPage({ limit: 200 }).catch(() => null),
				fetchMyShares({ limit: 200 }).catch(() => null)
			]);
			if (favs) this.#favorites = new Set(favs.items.map((f) => f.resource.id));
			if (shares) this.#shared = new Set(shares.items.map((s) => s.resource.id));
			this.#loaded = true;
			this.#inflight = null;
		})();
		return this.#inflight;
	}

	/** Optimistically reflect a favorite toggle (no refetch). */
	setFavorite(id: string, on: boolean): void {
		if (on === this.#favorites.has(id)) return;
		const next = new Set(this.#favorites);
		if (on) next.add(id);
		else next.delete(id);
		this.#favorites = next;
	}

	/** Mark an item as having an outgoing share (after one is created). */
	markShared(id: string): void {
		if (this.#shared.has(id)) return;
		this.#shared = new Set(this.#shared).add(id);
	}

	/** Drop the cache (e.g. on logout) so the next session reloads fresh. */
	reset(): void {
		this.#favorites = new Set();
		this.#shared = new Set();
		this.#loaded = false;
		this.#inflight = null;
	}
}

export const badges = new BadgesStore();
