/**
 * Files view state — replaces the navigation-related fields of the legacy `app`
 * state object (currentFolder, currentFolderInfo, breadcrumbPath, view mode,
 * section, selection). Dialog/context-menu targets stay component-local until a
 * view proves they must be shared.
 */
import type { FolderItem } from '$lib/api/types';

export type ViewMode = 'grid' | 'list';
export type Section =
	| 'files'
	| 'shared'
	| 'shared-with-me'
	| 'recent'
	| 'favorites'
	| 'trash'
	| 'photos'
	| 'music';

const VIEW_KEY = 'oxicloud_view_mode';

function readViewMode(): ViewMode {
	if (typeof localStorage === 'undefined') return 'grid';
	return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
}

class FilesStore {
	currentFolder = $state<string | null>(null);
	currentFolderInfo = $state<FolderItem | null>(null);
	breadcrumbPath = $state<Array<{ id: string; name: string }>>([]);
	viewMode = $state<ViewMode>(readViewMode());
	section = $state<Section>('files');
	isSearchMode = $state(false);
	selection = $state<Set<string>>(new Set());

	setViewMode(mode: ViewMode): void {
		this.viewMode = mode;
		if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_KEY, mode);
	}

	clearSelection(): void {
		this.selection = new Set();
	}

	toggleSelected(id: string): void {
		const next = new Set(this.selection);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		this.selection = next;
	}
}

export const files = new FilesStore();
