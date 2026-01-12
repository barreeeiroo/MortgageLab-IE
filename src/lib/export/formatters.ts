/**
 * Formatting utilities for export files.
 * These are tailored for CSV/Excel/PDF output rather than UI display.
 */

/**
 * Formats currency for export with Euro symbol.
 * @param value Value in euros
 * @param showDecimals Whether to show decimal places
 */
export function formatCurrencyForExport(
	value: number,
	showDecimals = false,
): string {
	return new Intl.NumberFormat("en-IE", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: showDecimals ? 2 : 0,
		maximumFractionDigits: showDecimals ? 2 : 0,
	}).format(value);
}

/**
 * Formats currency as plain number for Excel (no symbol).
 * Excel can then apply its own currency formatting.
 * @param value Value in euros
 */
export function formatCurrencyRaw(value: number): number {
	return value;
}

/**
 * Formats percentage for export.
 * @param value Decimal value (e.g., 0.035 for 3.5%)
 * @param decimals Number of decimal places
 */
export function formatPercentForExport(value: number, decimals = 2): string {
	return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Formats percentage as plain number for Excel.
 * Excel can then apply its own percentage formatting.
 * @param value Decimal value (e.g., 0.035 for 3.5%)
 */
export function formatPercentRaw(value: number): number {
	return value;
}

/**
 * Formats date for export in DD/MM/YYYY format (Irish standard).
 */
export function formatDateForExport(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}/${month}/${year}`;
}

/**
 * Formats month/year for export (e.g., "Jan 2026").
 */
export function formatMonthYearForExport(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toLocaleDateString("en-IE", { month: "short", year: "numeric" });
}

/**
 * Formats mortgage term for export.
 * @param months Total months
 */
export function formatTermForExport(months: number): string {
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;

	if (remainingMonths === 0) {
		return `${years} year${years !== 1 ? "s" : ""}`;
	}
	return `${years}y ${remainingMonths}m`;
}

/**
 * Formats a number with thousand separators for display.
 */
export function formatNumberForExport(value: number, decimals = 0): string {
	return new Intl.NumberFormat("en-IE", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	}).format(value);
}

/**
 * Sanitizes text for PDF export by replacing Unicode characters
 * that jsPDF's default Helvetica font doesn't support.
 */
export function sanitizeForPDF(text: string): string {
	return text
		.replace(/\u2264/g, "<=") // ≤
		.replace(/\u2265/g, ">=") // ≥
		.replace(/\u2013/g, "-") // en-dash –
		.replace(/\u2014/g, "-") // em-dash —
		.replace(/\u2018/g, "'") // left single quote '
		.replace(/\u2019/g, "'") // right single quote '
		.replace(/\u201C/g, '"') // left double quote "
		.replace(/\u201D/g, '"'); // right double quote "
}
