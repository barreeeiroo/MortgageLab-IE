/**
 * CSV generation utilities with proper escaping.
 * No external dependencies - uses native JavaScript.
 */

import {
	downloadFile,
	type ExportPage,
	generateExportFilename,
	type TableExportData,
} from "../types";

// UTF-8 BOM for proper encoding in Excel
const UTF8_BOM = "\uFEFF";

/**
 * Escapes a value for CSV format.
 * - Numbers are written as-is
 * - Strings are always quoted to prevent issues with commas
 * - Internal quotes are doubled
 */
function escapeCSVValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined) {
		return "";
	}

	// Numbers don't need quoting
	if (typeof value === "number") {
		return String(value);
	}

	const str = String(value);

	// Always quote strings - escape internal quotes by doubling them
	return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Converts table data to CSV string format.
 * Includes UTF-8 BOM for proper encoding in Excel.
 */
export function generateCSV(data: TableExportData): string {
	const lines: string[] = [];

	// Header row
	lines.push(data.headers.map(escapeCSVValue).join(","));

	// Data rows
	for (const row of data.rows) {
		lines.push(row.map(escapeCSVValue).join(","));
	}

	// Add UTF-8 BOM at the start for Excel compatibility
	return UTF8_BOM + lines.join("\n");
}

/**
 * Exports table data as a CSV file download.
 */
export function exportToCSV(data: TableExportData, page: ExportPage): void {
	const csv = generateCSV(data);
	const filename = generateExportFilename(page, "csv");
	downloadFile(csv, filename, "text/csv;charset=utf-8");
}

/**
 * Exports table data as CSV with a custom filename.
 */
export function exportToCSVWithFilename(
	data: TableExportData,
	filename: string,
): void {
	const csv = generateCSV(data);
	downloadFile(csv, filename, "text/csv;charset=utf-8");
}
