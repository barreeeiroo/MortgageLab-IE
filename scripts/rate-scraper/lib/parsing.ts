/**
 * Common parsing utilities for mortgage rate scrapers
 */

/**
 * Parse a percentage value from text.
 *
 * @param text - Text containing a percentage (e.g., "3.45%", "3.45 %", "Rate: 3.45%")
 * @returns The parsed number or null if not found
 *
 * @example
 * parsePercentage("3.45%") // 3.45
 * parsePercentage("Rate: 3.45 %") // 3.45
 * parsePercentage("N/A") // null
 */
export function parsePercentage(text: string): number | null {
	const match = text.replace(/\s/g, "").match(/(\d+\.?\d*)/);
	if (!match) return null;
	return Number.parseFloat(match[1]);
}

/**
 * Parse a percentage value from text, throwing on failure.
 *
 * @param text - Text containing a percentage
 * @returns The parsed number
 * @throws Error if no percentage found
 */
export function parsePercentageOrThrow(text: string): number {
	const result = parsePercentage(text);
	if (result === null) {
		throw new Error(`Could not parse percentage: ${text}`);
	}
	return result;
}

/**
 * Parse a fixed term (in years) from product name or text.
 *
 * @param text - Text containing a term (e.g., "3 Year Fixed", "5yr", "10 Years")
 * @returns The term in years or null if not found
 *
 * @example
 * parseTermFromText("3 Year Fixed") // 3
 * parseTermFromText("5yr Fixed Rate") // 5
 * parseTermFromText("Variable Rate") // null
 */
export function parseTermFromText(text: string): number | null {
	const match = text.match(/(\d+)\s*(?:year|yr)/i);
	if (!match) return null;
	return Number.parseInt(match[1], 10);
}

/**
 * Parse a fixed term from text, throwing on failure.
 *
 * @param text - Text containing a term
 * @returns The term in years
 * @throws Error if no term found
 */
export function parseTermOrThrow(text: string): number {
	const result = parseTermFromText(text);
	if (result === null) {
		throw new Error(`Could not parse term: ${text}`);
	}
	return result;
}

/**
 * LTV band result
 */
export interface LtvBand {
	minLtv: number;
	maxLtv: number;
}

/**
 * Parse LTV band from text.
 *
 * Handles common formats:
 * - "≤50%", "<=50%" → { minLtv: 0, maxLtv: 50 }
 * - ">50% ≤60%", ">50% & ≤60%" → { minLtv: 50, maxLtv: 60 }
 * - ">80%" → { minLtv: 80, maxLtv: 90 }
 *
 * @param text - Text containing LTV information
 * @returns LTV band or null if not parseable
 */
export function parseLtvBand(text: string): LtvBand | null {
	const cleanText = text.replace(/\s/g, "").toLowerCase();

	// ≤50% or <=50%
	if (cleanText.includes("≤50%") || cleanText.includes("<=50%")) {
		return { minLtv: 0, maxLtv: 50 };
	}

	// >50% ≤60% or >50% & ≤60%
	if (cleanText.includes(">50%") && cleanText.includes("60%")) {
		return { minLtv: 50, maxLtv: 60 };
	}

	// >60% ≤70%
	if (cleanText.includes(">60%") && cleanText.includes("70%")) {
		return { minLtv: 60, maxLtv: 70 };
	}

	// >70% ≤80%
	if (cleanText.includes(">70%") && cleanText.includes("80%")) {
		return { minLtv: 70, maxLtv: 80 };
	}

	// >80% ≤90% or just >80%
	if (cleanText.includes(">80%")) {
		return { minLtv: 80, maxLtv: 90 };
	}

	// ≤60% (without lower bound)
	if (cleanText.includes("≤60%") || cleanText.includes("<=60%")) {
		return { minLtv: 0, maxLtv: 60 };
	}

	// ≤70%
	if (cleanText.includes("≤70%") || cleanText.includes("<=70%")) {
		return { minLtv: 0, maxLtv: 70 };
	}

	// ≤80%
	if (cleanText.includes("≤80%") || cleanText.includes("<=80%")) {
		return { minLtv: 0, maxLtv: 80 };
	}

	// ≤90%
	if (cleanText.includes("≤90%") || cleanText.includes("<=90%")) {
		return { minLtv: 0, maxLtv: 90 };
	}

	return null;
}

/**
 * Parse LTV band from text, throwing on failure.
 *
 * @param text - Text containing LTV information
 * @returns LTV band
 * @throws Error if not parseable
 */
export function parseLtvBandOrThrow(text: string): LtvBand {
	const result = parseLtvBand(text);
	if (result === null) {
		throw new Error(`Could not parse LTV: ${text}`);
	}
	return result;
}

/**
 * Parse LTV from product name or text (common pattern in Irish lender names).
 *
 * Handles formats like:
 * - "Fixed Rate ≤50%" → { minLtv: 0, maxLtv: 50 }
 * - "Fixed Rate >50% ≤80%" → { minLtv: 50, maxLtv: 80 }
 * - "Fixed Rate >80%" → { minLtv: 80, maxLtv: 90 }
 * - "less than or equal to 50%" → { minLtv: 0, maxLtv: 50 }
 * - "greater than 50%" + "60%" → { minLtv: 50, maxLtv: 60 }
 * - "<= 60%" or "≤ 60%" → { minLtv: 0, maxLtv: 60 }
 * - "Fixed Rate" (no LTV) → { minLtv: 0, maxLtv: 90 }
 *
 * @param name - Product name or LTV text
 * @returns LTV band (defaults to 0-90 if not specified)
 */
export function parseLtvFromName(name: string): LtvBand {
	// Normalize: lowercase and remove spaces for consistent matching
	const lowerName = name.toLowerCase().replace(/\s/g, "");

	// Check for explicit LTV bands - symbol patterns first
	if (
		lowerName.includes("≤50%") ||
		lowerName.includes("<=50%") ||
		lowerName.includes("<50%") ||
		lowerName.includes("lessthanorequalto50%") ||
		lowerName.includes("upto50%")
	) {
		return { minLtv: 0, maxLtv: 50 };
	}

	// >50% to 60%
	if (
		(lowerName.includes(">50%") || lowerName.includes("greaterthan50%")) &&
		(lowerName.includes("60%") || lowerName.includes("≤60%"))
	) {
		return { minLtv: 50, maxLtv: 60 };
	}

	// ≤60% (without lower bound)
	if (
		lowerName.includes("≤60%") ||
		lowerName.includes("<=60%") ||
		lowerName.includes("<60%") ||
		lowerName.includes("lessthanorequalto60%")
	) {
		return { minLtv: 0, maxLtv: 60 };
	}

	// >60% to 70%
	if (
		(lowerName.includes(">60%") || lowerName.includes("greaterthan60%")) &&
		(lowerName.includes("70%") || lowerName.includes("≤70%"))
	) {
		return { minLtv: 60, maxLtv: 70 };
	}

	// >60% to 80%
	if (
		(lowerName.includes(">60%") || lowerName.includes("greaterthan60%")) &&
		(lowerName.includes("80%") || lowerName.includes("≤80%"))
	) {
		return { minLtv: 60, maxLtv: 80 };
	}

	// ≤70% (without lower bound)
	if (
		lowerName.includes("≤70%") ||
		lowerName.includes("<=70%") ||
		lowerName.includes("<70%") ||
		lowerName.includes("lessthanorequalto70%")
	) {
		return { minLtv: 0, maxLtv: 70 };
	}

	// >70% to 80%
	if (
		(lowerName.includes(">70%") || lowerName.includes("greaterthan70%")) &&
		(lowerName.includes("80%") || lowerName.includes("≤80%"))
	) {
		return { minLtv: 70, maxLtv: 80 };
	}

	// >50% to 80% (must come before ≤80% check)
	if (
		(lowerName.includes(">50%") || lowerName.includes("greaterthan50%")) &&
		lowerName.includes("80%")
	) {
		return { minLtv: 50, maxLtv: 80 };
	}

	// ≤80% (without lower bound)
	if (
		lowerName.includes("≤80%") ||
		lowerName.includes("<=80%") ||
		lowerName.includes("<80%") ||
		lowerName.includes("lessthanorequalto80%")
	) {
		return { minLtv: 0, maxLtv: 80 };
	}

	// >80% to 90%
	if (
		lowerName.includes(">80%") ||
		lowerName.includes("&gt;80%") ||
		lowerName.includes("greaterthan80%")
	) {
		return { minLtv: 80, maxLtv: 90 };
	}

	// Default: all LTV ranges
	return { minLtv: 0, maxLtv: 90 };
}
