/** Profile / account endpoints — ported from views/profile/profile.js. */
import { apiFetch } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';
import type { User } from '$lib/api/types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface ProfilePatch {
	username?: string;
	given_name?: string;
	family_name?: string;
	preferred_locale?: string;
	notify_on_share?: boolean;
}

export async function updateProfile(patch: ProfilePatch): Promise<User> {
	const res = await apiFetch('/api/auth/me/profile', {
		method: 'PATCH',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify(patch)
	});
	if (!res.ok) throw new Error(`profile update failed: ${res.status}`);
	return (await res.json()) as User;
}

export async function changePassword(currentPw: string, newPw: string): Promise<void> {
	const res = await apiFetch('/api/auth/change-password', {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ current_password: currentPw, new_password: newPw })
	});
	if (!res.ok) throw new Error(`password change failed: ${res.status}`);
}

export async function updateAvatar(image: string): Promise<void> {
	const res = await apiFetch('/api/auth/me/image', {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { ...JSON_HEADERS, ...getCsrfHeaders() },
		body: JSON.stringify({ image })
	});
	if (!res.ok) throw new Error(`avatar update failed: ${res.status}`);
}
