/** Sharing (ReBAC grants) endpoints — ported from model/grants.js. */
import { apiFetch } from '$lib/api/client';
import type { ItemType } from '$lib/api/types';
import type { ResourceBody, ResourcePage } from './resources';

export interface IncomingGrantItem {
	resource_type: ItemType;
	resource: ResourceBody;
	granted_by?: string;
	granted_at?: string;
	role?: string;
}

export interface OutgoingGrantItem {
	resource_type: ItemType;
	resource: ResourceBody;
	subject?: string;
	first_shared_at?: string;
	role?: string;
}

interface GrantsPageOpts {
	cursor?: string;
	orderBy?: string;
	limit?: number;
	reverse?: boolean;
	resourceTypes?: ItemType[];
}

function params(opts: GrantsPageOpts): string {
	const { cursor, orderBy, limit = 50, reverse = false, resourceTypes } = opts;
	const p = new URLSearchParams({ limit: String(limit) });
	if (resourceTypes?.length) p.set('resource_types', resourceTypes.join(','));
	if (cursor) p.set('cursor', cursor);
	if (orderBy) p.set('sort_by', orderBy);
	if (reverse) p.set('reverse', 'true');
	return p.toString();
}

export async function fetchSharedWithMe(
	opts: GrantsPageOpts = {}
): Promise<ResourcePage<IncomingGrantItem>> {
	const res = await apiFetch(
		`/api/grants/incoming/resources?${params({ resourceTypes: ['file', 'folder'], ...opts })}`,
		{ credentials: 'same-origin' }
	);
	if (!res.ok) throw new Error(`shared-with-me failed: ${res.status}`);
	return (await res.json()) as ResourcePage<IncomingGrantItem>;
}

export async function fetchMyShares(
	opts: GrantsPageOpts = {}
): Promise<ResourcePage<OutgoingGrantItem>> {
	const res = await apiFetch(`/api/grants/outgoing/resources?${params(opts)}`, {
		credentials: 'same-origin'
	});
	if (!res.ok) throw new Error(`my-shares failed: ${res.status}`);
	return (await res.json()) as ResourcePage<OutgoingGrantItem>;
}
