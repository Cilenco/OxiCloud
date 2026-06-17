/** File endpoints — ported from fileOperations.js. */
import { apiFetch } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function uploadFile(folderId: string | null, file: File): Promise<void> {
	const form = new FormData();
	if (folderId) form.append('folder_id', folderId);
	form.append('file', file);
	const res = await apiFetch('/api/files/upload', {
		method: 'POST',
		credentials: 'same-origin',
		cache: 'no-store',
		headers: getCsrfHeaders(), // multipart boundary set automatically; do not set Content-Type
		body: form
	});
	if (!res.ok) throw new Error(`upload failed: ${res.status}`);
}

export async function renameFile(fileId: string, name: string): Promise<void> {
	const res = await apiFetch(`/api/files/${fileId}/rename`, {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ name })
	});
	if (!res.ok) throw new Error(`rename file failed: ${res.status}`);
}

export async function moveFile(fileId: string, targetFolderId: string | null): Promise<void> {
	const res = await apiFetch(`/api/files/${fileId}/move`, {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ folder_id: targetFolderId || null })
	});
	if (!res.ok) throw new Error(`move file failed: ${res.status}`);
}

export async function deleteFile(fileId: string): Promise<void> {
	const res = await apiFetch(`/api/files/${fileId}`, {
		method: 'DELETE',
		credentials: 'same-origin',
		headers: getCsrfHeaders()
	});
	if (!res.ok) throw new Error(`delete file failed: ${res.status}`);
}

export function fileDownloadUrl(fileId: string): string {
	return `/api/files/${fileId}`;
}

export function fileInlineUrl(fileId: string): string {
	return `/api/files/${fileId}?inline=true`;
}

export function fileThumbnailUrl(fileId: string): string {
	return `/api/files/${fileId}/thumbnail/preview`;
}
