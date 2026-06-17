/**
 * Admin endpoints — ported from views/admin/admin.js. Covers users + plugins
 * (the core management surfaces). Settings (OIDC/storage/SMTP), storage
 * migration, and plugin logs/retention are not yet ported — see the admin route.
 */
import { apiFetch, apiJson } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';
import type { User } from '$lib/api/types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function mutate(url: string, method: string, body?: unknown): Promise<void> {
	const res = await apiFetch(url, {
		method,
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: body === undefined ? undefined : JSON.stringify(body)
	});
	if (!res.ok) {
		const e = (await res.json().catch(() => ({}))) as { message?: string };
		throw new Error(e.message || `${method} ${url} failed: ${res.status}`);
	}
}

// ── Users ───────────────────────────────────────────────────────────────

export interface AdminUsersPage {
	total: number;
	users: User[];
}

export function listUsers(limit: number, offset: number): Promise<AdminUsersPage> {
	return apiJson<AdminUsersPage>(`/api/admin/users?limit=${limit}&offset=${offset}`, {
		credentials: 'same-origin'
	});
}

export interface CreateUserInput {
	username: string;
	password: string;
	email: string;
	role: string;
	quota_bytes: number;
}

export function createUser(input: CreateUserInput): Promise<void> {
	return mutate('/api/admin/users', 'POST', input);
}

export function setUserRole(userId: string, role: string): Promise<void> {
	return mutate(`/api/admin/users/${userId}/role`, 'PUT', { role });
}

export function setUserActive(userId: string, active: boolean): Promise<void> {
	return mutate(`/api/admin/users/${userId}/active`, 'PUT', { active });
}

export function setUserQuota(userId: string, quotaBytes: number): Promise<void> {
	return mutate(`/api/admin/users/${userId}/quota`, 'PUT', { quota_bytes: quotaBytes });
}

export function resetUserPassword(userId: string, newPassword: string): Promise<void> {
	return mutate(`/api/admin/users/${userId}/password`, 'PUT', { new_password: newPassword });
}

export function deleteUser(userId: string): Promise<void> {
	return mutate(`/api/admin/users/${userId}`, 'DELETE');
}

// ── Plugins ─────────────────────────────────────────────────────────────

export interface PluginInfo {
	id: string;
	name: string;
	version?: string;
	enabled: boolean;
	description?: string;
}

export interface PluginsResult {
	/** false when the plugin subsystem is disabled (server returns 503). */
	available: boolean;
	enabled?: boolean;
	plugins: PluginInfo[];
}

export async function listPlugins(): Promise<PluginsResult> {
	const res = await apiFetch('/api/admin/plugins', { credentials: 'same-origin' });
	if (res.status === 503) return { available: false, plugins: [] };
	if (!res.ok) throw new Error(`plugins failed: ${res.status}`);
	const data = (await res.json()) as { enabled?: boolean; plugins?: PluginInfo[] };
	return { available: true, enabled: data.enabled, plugins: data.plugins ?? [] };
}

export function setPluginEnabled(id: string, enabled: boolean): Promise<void> {
	return mutate(`/api/admin/plugins/${encodeURIComponent(id)}/enabled`, 'PUT', { enabled });
}

export function deletePlugin(id: string): Promise<void> {
	return mutate(`/api/admin/plugins/${encodeURIComponent(id)}`, 'DELETE');
}
