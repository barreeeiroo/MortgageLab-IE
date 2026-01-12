declare const __BUILD_TIME__: number;

/**
 * Prepends the base path to a given path.
 * Handles both development (/) and production (/MortgageLab-IE/) base paths.
 * Adds cache-busting query param for data JSON files.
 */
export function getPath(path: string): string {
	const base = import.meta.env.BASE_URL;
	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
	const fullPath = `${normalizedBase}${normalizedPath}`;

	// Add cache-busting for data files
	if (path.startsWith("data/") && path.endsWith(".json")) {
		return `${fullPath}?v=${__BUILD_TIME__}`;
	}

	return fullPath;
}
