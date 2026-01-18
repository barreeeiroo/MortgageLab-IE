/**
 * Lender data fetching and helper utilities.
 */

import { type Lender, LendersFileSchema } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch lenders data from the JSON file.
 * @returns Array of lenders, or empty array on error
 */
export async function fetchLendersData(): Promise<Lender[]> {
	try {
		const res = await fetch(getPath("data/lenders.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return LendersFileSchema.parse(json);
	} catch {
		return [];
	}
}

/**
 * Get a lender by ID from an array of lenders
 */
export function getLender(lenders: Lender[], id: string): Lender | undefined {
	return lenders.find((l) => l.id === id);
}

/**
 * Get the lender for a given rate
 */
export function getLenderForRate(
	lenders: Lender[],
	rate: MortgageRate,
): Lender | undefined {
	return getLender(lenders, rate.lenderId);
}
