/**
 * Mortgage term utilities
 * Handles conversion between years/months and total months
 */

import {
	MAX_TERM_MONTHS,
	MAX_TERM_YEARS,
	MIN_TERM_MONTHS,
	MIN_TERM_YEARS,
} from "@/lib/constants/term";

/**
 * Split total months into years and remaining months
 */
export function splitTerm(totalMonths: number): {
	years: number;
	months: number;
} {
	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
}

/**
 * Combine years and months into total months
 */
export function combineTerm(years: number, months: number): number {
	return years * 12 + months;
}

/**
 * Format term for display
 * @param totalMonths - Total months
 * @param options.compact - Use abbreviated format ("30y 6m" vs "30 years 6 months")
 */
export function formatTermDisplay(
	totalMonths: number,
	options?: { compact?: boolean },
): string {
	const { years, months } = splitTerm(totalMonths);

	if (months === 0) {
		return options?.compact ? `${years} yrs` : `${years} years`;
	}

	if (options?.compact) {
		return `${years}y ${months}m`;
	}

	return `${years} years ${months} months`;
}

/**
 * Validate term is within allowed bounds
 */
export function isValidTerm(totalMonths: number): boolean {
	return totalMonths >= MIN_TERM_MONTHS && totalMonths <= MAX_TERM_MONTHS;
}

/**
 * Validate years value is within allowed bounds
 */
export function isValidTermYears(years: number): boolean {
	return years >= MIN_TERM_YEARS && years <= MAX_TERM_YEARS;
}
