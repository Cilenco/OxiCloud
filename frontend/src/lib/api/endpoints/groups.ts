/** Group (ReBAC) endpoints — ported from model/groups.js. */
import { apiFetch, apiJson } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const enc = encodeURIComponent;

export interface GroupItem {
	id: string;
	name: string;
	description?: string | null;
	member_count?: number;
}

export interface GroupMember {
	user_id?: string;
	group_id?: string;
	email?: string;
	name?: string;
}

async function mutate(url: string, method: string, body?: unknown): Promise<void> {
	const res = await apiFetch(url, {
		method,
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
}

/** The list endpoint may return an array or `{ groups | items, total }`. */
export async function listGroups(limit = 50, offset = 0, q?: string): Promise<GroupItem[]> {
	const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
	if (q) params.set('q', q);
	const data = await apiJson<GroupItem[] | { groups?: GroupItem[]; items?: GroupItem[] }>(
		`/api/groups?${params}`,
		{ credentials: 'same-origin' }
	);
	if (Array.isArray(data)) return data;
	return data.groups ?? data.items ?? [];
}

export function createGroup(name: string, description?: string | null): Promise<void> {
	return mutate('/api/groups', 'POST', { name, description: description ?? null });
}

export function renameGroup(id: string, name: string): Promise<void> {
	return mutate(`/api/groups/${enc(id)}`, 'PATCH', { name });
}

export function deleteGroup(id: string): Promise<void> {
	return mutate(`/api/groups/${enc(id)}`, 'DELETE');
}

export function listMembers(id: string): Promise<GroupMember[]> {
	return apiJson<GroupMember[]>(`/api/groups/${enc(id)}/members`, { credentials: 'same-origin' });
}

export function addUserMember(groupId: string, userId: string): Promise<void> {
	return mutate(`/api/groups/${enc(groupId)}/members`, 'POST', { user_id: userId });
}

export function removeUserMember(groupId: string, userId: string): Promise<void> {
	return mutate(`/api/groups/${enc(groupId)}/members/user/${enc(userId)}`, 'DELETE');
}

export function removeGroupMember(groupId: string, memberGroupId: string): Promise<void> {
	return mutate(`/api/groups/${enc(groupId)}/members/group/${enc(memberGroupId)}`, 'DELETE');
}
