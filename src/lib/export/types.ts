/**
 * Shared types and utilities for export functionality.
 */

export type ExportFormat = "csv" | "xlsx" | "pdf" | "png";

export type ExportPage =
	| "rates"
	| "simulation"
	| "breakeven-rentvsbuy"
	| "breakeven-remortgage"
	| "affordability-ftb"
	| "affordability-mover"
	| "affordability-btl";

/**
 * Generic table data structure for CSV/Excel exports.
 */
export interface TableExportData {
	headers: string[];
	rows: (string | number | null | undefined)[][];
}

/**
 * Generates a standardized export filename with timestamp.
 * Format: mortgagelab-{page}-{YYYYMMDD-HHmm}.{ext}
 *
 * @example
 * generateExportFilename('rates', 'csv')
 * // => 'mortgagelab-rates-20260112-1430.csv'
 */
export function generateExportFilename(
	page: ExportPage,
	format: ExportFormat,
): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");

	const timestamp = `${year}${month}${day}-${hours}${minutes}`;
	return `mortgagelab-${page}-${timestamp}.${format}`;
}

/**
 * Triggers a browser download for the given data.
 */
export function downloadFile(
	data: Blob | string,
	filename: string,
	mimeType?: string,
): void {
	const blob =
		data instanceof Blob
			? data
			: new Blob([data], { type: mimeType ?? "text/plain" });

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
