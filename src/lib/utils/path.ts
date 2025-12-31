/**
 * Prepends the base path to a given path.
 * Handles both development (/) and production (/MortgageLab-IE/) base paths.
 */
export function getPath(path: string): string {
	const base = import.meta.env.BASE_URL;
	const normalizedBase = base.endsWith("/") ? base : `${base}/`;
	const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
	return `${normalizedBase}${normalizedPath}`;
}
