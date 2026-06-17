/** Music / playlist endpoints — ported from features/library/music.js. */
import { apiFetch, apiJson } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface Playlist {
	id: string;
	name: string;
	description: string | null;
	owner_id: string;
	is_public: boolean;
	cover_file_id: string | null;
	track_count: number;
	total_duration_secs: number;
	created_at: number;
	updated_at: number;
}

export interface PlaylistItem {
	id: string;
	playlist_id: string;
	file_id: string;
	position: number;
	added_at: number;
	file_name: string | null;
	file_size: number | null;
	mime_type: string | null;
	title: string | null;
	artist: string | null;
	album: string | null;
	duration_secs: number | null;
}

export function listPlaylists(): Promise<Playlist[]> {
	return apiJson<Playlist[]>('/api/playlists', { credentials: 'same-origin' });
}

export function listTracks(playlistId: string): Promise<PlaylistItem[]> {
	return apiJson<PlaylistItem[]>(`/api/playlists/${playlistId}/tracks`, {
		credentials: 'same-origin'
	});
}

export async function createPlaylist(name: string): Promise<Playlist> {
	const res = await apiFetch('/api/playlists', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ name, description: null })
	});
	if (!res.ok) throw new Error(`create playlist failed: ${res.status}`);
	return (await res.json()) as Playlist;
}

export async function renamePlaylist(playlistId: string, name: string): Promise<void> {
	const res = await apiFetch(`/api/playlists/${playlistId}`, {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ name })
	});
	if (!res.ok) throw new Error(`rename playlist failed: ${res.status}`);
}

export async function deletePlaylist(playlistId: string): Promise<void> {
	const res = await apiFetch(`/api/playlists/${playlistId}`, {
		method: 'DELETE',
		credentials: 'same-origin',
		headers: getCsrfHeaders()
	});
	if (!res.ok) throw new Error(`delete playlist failed: ${res.status}`);
}

export async function addTracks(playlistId: string, fileIds: string[]): Promise<void> {
	const res = await apiFetch(`/api/playlists/${playlistId}/tracks`, {
		method: 'POST',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ file_ids: fileIds })
	});
	if (!res.ok) throw new Error(`add tracks failed: ${res.status}`);
}

export async function removeTrack(playlistId: string, fileId: string): Promise<void> {
	const res = await apiFetch(`/api/playlists/${playlistId}/tracks/${encodeURIComponent(fileId)}`, {
		method: 'DELETE',
		credentials: 'same-origin',
		headers: getCsrfHeaders()
	});
	if (!res.ok) throw new Error(`remove track failed: ${res.status}`);
}

/** Persist a new track order. `itemIds` are PlaylistItem ids in the desired order. */
export async function reorderTracks(playlistId: string, itemIds: string[]): Promise<void> {
	const res = await apiFetch(`/api/playlists/${playlistId}/reorder`, {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ item_ids: itemIds })
	});
	if (!res.ok) throw new Error(`reorder failed: ${res.status}`);
}
