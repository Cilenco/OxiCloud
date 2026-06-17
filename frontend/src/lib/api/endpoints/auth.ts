/**
 * Auth endpoints. The 401-refresh/dedup behaviour lives in apiFetch; the auth
 * primitives here intentionally bypass it (see client.ts) so a 401 surfaces as
 * a genuine failure to the caller.
 */
import { apiFetch } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';
import type { AuthResponse, User } from '$lib/api/types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Probe the current session. Uses the raw `fetch` (NOT apiFetch) on purpose:
 * a 401 here just means "not logged in" and must not trigger the global
 * refresh-and-redirect (which would bounce the app in a refresh loop on the
 * unauthenticated initial load). Returns null when unauthenticated.
 */
export async function fetchMe(): Promise<User | null> {
	const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
	if (res.status === 401) return null;
	if (!res.ok) throw new Error(`/api/auth/me failed: ${res.status}`);
	return (await res.json()) as User;
}

/**
 * Attempt a single token refresh (raw fetch, no interceptor). Returns whether
 * it succeeded. Used by the startup probe; mid-session refresh is handled
 * transparently by apiFetch for all other endpoints.
 */
export async function tryRefresh(): Promise<boolean> {
	try {
		const res = await fetch('/api/auth/refresh', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
			body: '{}'
		});
		return res.ok;
	} catch {
		return false;
	}
}

export async function login(emailOrUsername: string, password: string): Promise<AuthResponse> {
	const res = await apiFetch('/api/auth/login', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ username: emailOrUsername, password })
	});
	if (!res.ok) throw new Error(`login failed: ${res.status}`);
	return (await res.json()) as AuthResponse;
}

export async function logout(): Promise<void> {
	await apiFetch('/api/auth/logout', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: '{}'
	});
}
