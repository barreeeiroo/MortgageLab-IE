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
	if (typeof window === "undefined") return null;
	const url = new URL(window.location.href);
	return url.searchParams.get(key);
}

/**
 * Remove a parameter from the URL without reloading the page
 */
export function clearUrlParam(key: string): void {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.delete(key);
	window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/**
 * Check if a share parameter exists in the URL
 */
export function hasUrlParam(key: string): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).has(key);
}

interface GenerateShareUrlOptions {
	hash?: string;
}

/**
 * Generate a shareable URL with compressed data
 */
export function generateShareUrl<T>(
	param: string,
	data: T,
	options?: GenerateShareUrlOptions,
): string {
	const encoded = compressToUrl(data);
	const url = new URL(window.location.href);
	url.searchParams.set(param, encoded);
	if (options?.hash) {
		url.hash = options.hash;
	}
	return url.toString();
}

/**
 * Parse and decompress share state from URL parameter
 */
export function parseShareParam<T>(param: string): T | null {
	const encoded = getUrlParam(param);
	if (!encoded) return null;
	return decompressFromUrl<T>(encoded);
}
