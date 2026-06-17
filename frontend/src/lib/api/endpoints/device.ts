/** Device-authorization (RFC 8628) verification endpoints. */
import { apiFetch } from '$lib/api/client';
import { getCsrfHeaders } from '$lib/api/csrf';

export interface DeviceInfo {
	client_name?: string;
	scopes?: string;
}

export async function lookupDeviceCode(code: string): Promise<DeviceInfo> {
	const res = await apiFetch(`/api/auth/device/verify?code=${encodeURIComponent(code)}`, {
		credentials: 'same-origin'
	});
	if (!res.ok) throw new Error(`device lookup failed: ${res.status}`);
	return (await res.json()) as DeviceInfo;
}

export async function decideDevice(userCode: string, action: 'approve' | 'deny'): Promise<void> {
	const res = await apiFetch('/api/auth/device/verify', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
		body: JSON.stringify({ user_code: userCode, action })
	});
	if (!res.ok) throw new Error(`device ${action} failed: ${res.status}`);
}
