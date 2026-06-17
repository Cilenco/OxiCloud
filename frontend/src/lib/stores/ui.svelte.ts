/**
 * Transient UI state — toasts now; cross-component dialog targets are added as
 * the views that need them land (Phases 2–4). Component-local state is preferred;
 * only state that must cross component boundaries belongs here.
 */
export type ToastKind = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
	id: number;
	message: string;
	kind: ToastKind;
}

class UiStore {
	toasts = $state<Toast[]>([]);
	#seq = 0;

	notify(message: string, kind: ToastKind = 'info', timeoutMs = 4000): number {
		const id = ++this.#seq;
		this.toasts = [...this.toasts, { id, message, kind }];
		if (timeoutMs > 0 && typeof setTimeout !== 'undefined') {
			setTimeout(() => this.dismiss(id), timeoutMs);
		}
		return id;
	}

	dismiss(id: number): void {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}
}

export const ui = new UiStore();
