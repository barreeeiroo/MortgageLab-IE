import { formatCurrency, formatCurrencyShort } from "./currency";

/**
 * Shared chart constants and formatters
 *
 * All currency values in this module expect cents (×100) to match
 * the internal storage convention used throughout the codebase.
 */

// Animation duration for chart transitions (ms)
export const CHART_ANIMATION_DURATION = 400;

/**
 * Format currency value for chart display (with cents precision)
 * @param cents - Amount in cents (×100)
 * @returns Formatted currency string (e.g., "€12,345")
 */
export function formatChartCurrency(cents: number): string {
	return formatCurrency(cents / 100, { showCents: false });
}

/**
 * Format currency value for chart axis labels (abbreviated)
 * @param cents - Amount in cents (×100)
 * @returns Abbreviated currency string (e.g., "€12k", "€1.2m")
 */
export function formatChartCurrencyShort(cents: number): string {
	return formatCurrencyShort(cents / 100);
}

/**
 * Format percentage value for chart display
 * @param value - Percentage value (e.g., 3.45 for 3.45%)
 * @returns Formatted percentage string (e.g., "3.45%")
 */
export function formatChartPercentage(value: number): string {
	return `${value.toFixed(2)}%`;
}

/**
 * Format term in months for chart display
 * @param months - Number of months
 * @returns Formatted term string (e.g., "25y", "25y 6m")
 */
export function formatChartTerm(months: number): string {
	const years = Math.floor(months / 12);
	const remainingMonths = months % 12;
	if (remainingMonths === 0) return `${years}y`;
	return `${years}y ${remainingMonths}m`;
}
