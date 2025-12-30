import {
	type BerRating,
	type BuyerType,
	type Lender,
	LendersFileSchema,
	type MortgageRate,
	RatesFileSchema,
} from "@/lib/schemas";

import lendersJson from "../../../data/lenders.json";
import ratesJson from "../../../data/rates.json";

// Parse and validate data at import time
export const lenders: Lender[] = LendersFileSchema.parse(lendersJson);
export const rates: MortgageRate[] = RatesFileSchema.parse(ratesJson);

// Create a map for quick lender lookups
const lenderMap = new Map<string, Lender>(
	lenders.map((lender) => [lender.id, lender]),
);

/**
 * Get a lender by ID
 */
export function getLender(id: string): Lender | undefined {
	return lenderMap.get(id);
}

/**
 * Get the lender for a given rate
 */
export function getLenderForRate(rate: MortgageRate): Lender | undefined {
	return lenderMap.get(rate.lenderId);
}

export interface RateFilter {
	ltv?: number;
	buyerType?: BuyerType;
	ber?: BerRating;
	lenderId?: string;
	type?: "fixed" | "variable";
	fixedTerm?: number;
}

/**
 * Filter rates based on criteria
 */
export function filterRates(filter: RateFilter): MortgageRate[] {
	return rates.filter((rate) => {
		// Filter by LTV
		if (filter.ltv !== undefined) {
			if (filter.ltv < rate.minLtv || filter.ltv > rate.maxLtv) {
				return false;
			}
		}

		// Filter by buyer type
		if (filter.buyerType !== undefined) {
			if (!rate.buyerTypes.includes(filter.buyerType)) {
				return false;
			}
		}

		// Filter by BER rating
		if (filter.ber !== undefined && rate.berEligible !== undefined) {
			if (!rate.berEligible.includes(filter.ber)) {
				return false;
			}
		}

		// Filter by lender
		if (filter.lenderId !== undefined) {
			if (rate.lenderId !== filter.lenderId) {
				return false;
			}
		}

		// Filter by rate type
		if (filter.type !== undefined) {
			if (rate.type !== filter.type) {
				return false;
			}
		}

		// Filter by fixed term
		if (filter.fixedTerm !== undefined) {
			if (rate.fixedTerm !== filter.fixedTerm) {
				return false;
			}
		}

		return true;
	});
}

/**
 * Get rates sorted by rate (lowest first)
 */
export function getRatesSortedByRate(filter?: RateFilter): MortgageRate[] {
	const filtered = filter ? filterRates(filter) : rates;
	return [...filtered].sort((a, b) => a.rate - b.rate);
}

/**
 * Get all unique fixed terms available
 */
export function getAvailableFixedTerms(): number[] {
	const terms = new Set<number>();
	for (const rate of rates) {
		if (rate.fixedTerm !== undefined) {
			terms.add(rate.fixedTerm);
		}
	}
	return [...terms].sort((a, b) => a - b);
}

// Re-export BER utilities
export { BER_RATINGS, GREEN_BER_RATINGS, isGreenBer } from "@/lib/constants";
// Re-export schema types
export * from "@/lib/schemas";
