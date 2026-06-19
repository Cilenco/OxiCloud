import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api/endpoints/favorites', () => ({ fetchFavoritesPage: vi.fn() }));
vi.mock('$lib/api/endpoints/grants', () => ({ fetchMyShares: vi.fn() }));

import { fetchFavoritesPage } from '$lib/api/endpoints/favorites';
import { fetchMyShares } from '$lib/api/endpoints/grants';
import { badges } from './badges.svelte';

const favPage = (...ids: string[]) =>
	({ items: ids.map((id) => ({ resource: { id } })) }) as unknown as Awaited<
		ReturnType<typeof fetchFavoritesPage>
	>;
const sharePage = (...ids: string[]) =>
	({ items: ids.map((id) => ({ resource: { id } })) }) as unknown as Awaited<
		ReturnType<typeof fetchMyShares>
	>;

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(fetchFavoritesPage).mockResolvedValue(favPage('f1', 'f2'));
	vi.mocked(fetchMyShares).mockResolvedValue(sharePage('s1'));
	badges.reset();
});

describe('badges store', () => {
	it('loads once and serves every later navigation from cache', async () => {
		// Five "folder navigations" each call ensureLoaded.
		for (let i = 0; i < 5; i++) await badges.ensureLoaded();

		expect(fetchFavoritesPage).toHaveBeenCalledTimes(1);
		expect(fetchMyShares).toHaveBeenCalledTimes(1);
		expect(badges.isFavorite('f1')).toBe(true);
		expect(badges.isFavorite('f2')).toBe(true);
		expect(badges.isShared('s1')).toBe(true);
		expect(badges.isFavorite('nope')).toBe(false);
	});

	it('collapses concurrent loads into a single fetch', async () => {
		await Promise.all([
			badges.ensureLoaded(),
			badges.ensureLoaded(),
			badges.ensureLoaded(),
			badges.ensureLoaded()
		]);
		expect(fetchFavoritesPage).toHaveBeenCalledTimes(1);
		expect(fetchMyShares).toHaveBeenCalledTimes(1);
	});

	it('reflects favorite toggles optimistically without refetching', async () => {
		await badges.ensureLoaded();
		badges.setFavorite('x', true);
		expect(badges.isFavorite('x')).toBe(true);
		badges.setFavorite('x', false);
		expect(badges.isFavorite('x')).toBe(false);
		// No extra network for optimistic updates.
		expect(fetchFavoritesPage).toHaveBeenCalledTimes(1);
	});

	it('marks an item shared after a share is created', async () => {
		await badges.ensureLoaded();
		expect(badges.isShared('new')).toBe(false);
		badges.markShared('new');
		expect(badges.isShared('new')).toBe(true);
	});

	it('reset() clears the cache and allows a fresh reload', async () => {
		await badges.ensureLoaded();
		expect(fetchFavoritesPage).toHaveBeenCalledTimes(1);
		badges.reset();
		expect(badges.isFavorite('f1')).toBe(false);
		await badges.ensureLoaded();
		expect(fetchFavoritesPage).toHaveBeenCalledTimes(2);
	});
});
