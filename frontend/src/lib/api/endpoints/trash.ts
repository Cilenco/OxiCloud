/** Trash endpoints — ported from trashModel.js + views/trash. */
import { apiFetch } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';
import { fetchResourcePage, type ResourcePage, type ResourcePageOpts } from './resources';
import type { TrashResourceItem } from '$lib/api/types';

export function fetchTrashPage(opts?: ResourcePageOpts): Promise<ResourcePage<TrashResourceItem>> {
	return fetchResourcePage<TrashResourceItem>('/api/trash/resources', 'deletion_date', opts);
}

export async function restoreTrashItem(trashId: string): Promise<void> {
	const res = await apiFetch(`/api/trash/${trashId}/restore`, {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
		body: '{}'
	});
	if (!res.ok) throw new Error(`restore failed: ${res.status}`);
}

export async function deleteTrashItem(trashId: string): Promise<void> {
	const res = await apiFetch(`/api/trash/${trashId}`, {
		method: 'DELETE',
		credentials: 'same-origin',
		headers: getCsrfHeaders()
	});
	if (!res.ok) throw new Error(`permanent delete failed: ${res.status}`);
}

export async function emptyTrash(): Promise<void> {
	const res = await apiFetch('/api/trash/empty', {
		method: 'DELETE',
		credentials: 'same-origin',
		headers: getCsrfHeaders()
	});
	if (!res.ok) throw new Error(`empty trash failed: ${res.status}`);
}
