import lzString from "lz-string";

/**
 * Generic URL-safe compression utilities using lz-string
 */

/**
 * Compress data to a URL-safe encoded string
 */
export function compressToUrl<T>(data: T): string {
	const json = JSON.stringify(data);
	return lzString.compressToEncodedURIComponent(json);
}

/**
 * Decompress data from a URL-safe encoded string
 */
export function decompressFromUrl<T>(encoded: string): T | null {
	try {
		const json = lzString.decompressFromEncodedURIComponent(encoded);
		if (!json) return null;
		return JSON.parse(json) as T;
	} catch {
		return null;
	}
}

/**
 * Get a parameter from the current URL
 */
export function getUrlParam(key: string): string | null {
	const url = new URL(window.location.href);
	return url.searchParams.get(key);
}

/**
 * Remove a parameter from the URL without reloading the page
 */
export function clearUrlParam(key: string): void {
	const url = new URL(window.location.href);
	url.searchParams.delete(key);
	window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
