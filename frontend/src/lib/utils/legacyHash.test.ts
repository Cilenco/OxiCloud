import { describe, expect, it } from 'vitest';
import { legacyHashToPath } from './legacyHash';

describe('legacyHashToPath', () => {
	it('maps root and files', () => {
		expect(legacyHashToPath('#/')).toBe('/files');
		expect(legacyHashToPath('#/files')).toBe('/files');
	});

	it('maps folder deep links to the new path', () => {
		expect(legacyHashToPath('#/files/folder/abc')).toBe('/files/abc');
		expect(legacyHashToPath('#/files/folder/abc/def')).toBe('/files/abc/def');
	});

	it('maps the named sections', () => {
		expect(legacyHashToPath('#/shared')).toBe('/shared');
		expect(legacyHashToPath('#/sharedwithme')).toBe('/shared-with-me');
		expect(legacyHashToPath('#/recent')).toBe('/recent');
		expect(legacyHashToPath('#/favorites')).toBe('/favorites');
		expect(legacyHashToPath('#/trash')).toBe('/trash');
		expect(legacyHashToPath('#/photos')).toBe('/photos');
		expect(legacyHashToPath('#/music')).toBe('/music');
	});

	it('ignores query strings in the hash', () => {
		expect(legacyHashToPath('#/recent?foo=bar')).toBe('/recent');
	});

	it('returns null for non-legacy or unknown hashes', () => {
		expect(legacyHashToPath('')).toBeNull();
		expect(legacyHashToPath('#section')).toBeNull();
		expect(legacyHashToPath('#/unknown')).toBeNull();
	});
});
