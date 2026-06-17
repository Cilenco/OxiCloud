/** Photos timeline endpoint — ported from features/library/photos.js. */
import { apiFetch } from '$lib/api/client';
import type { FileItem } from '$lib/api/types';

export interface PhotoPage {
	items: FileItem[];
	nextCursor: string | null;
}

/**
 * Fetch one page of the photo timeline. The next-page cursor is returned in the
 * `X-Next-Cursor` response header; the page is the last one when fewer than
 * `limit` items come back.
 */
export async function fetchPhotos(limit = 60, before?: string | null): Promise<PhotoPage> {
	let url = `/api/photos?limit=${limit}`;
	if (before) url += `&before=${encodeURIComponent(before)}`;
	const res = await apiFetch(url, { credentials: 'same-origin' });
	if (!res.ok) throw new Error(`photos failed: ${res.status}`);
	const items = (await res.json()) as FileItem[];
	const cursor = res.headers.get('X-Next-Cursor');
	return {
		items: items ?? [],
		nextCursor: cursor && items && items.length >= limit ? cursor : null
	};
}
