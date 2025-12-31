import {
	type BerRating,
	type BuyerType,
	type Lender,
	type MortgageRate,
	type Perk,
	PerksFileSchema,
} from "@/lib/schemas";

import perksJson from "../../../data/perks.json";

// Perks are small and static, keep bundled
export const perks: Perk[] = PerksFileSchema.parse(perksJson);

// Create map for quick lookups
const perkMap = new Map<string, Perk>(perks.map((perk) => [perk.id, perk]));

/**
 * Get a perk by ID
 */
export function getPerk(id: string): Perk | undefined {
	return perkMap.get(id);
}

/**
 * Resolve an array of perk IDs to full Perk objects
 */
export function resolvePerks(perkIds: string[]): Perk[] {
	return perkIds.map((id) => perkMap.get(id)).filter((p): p is Perk => !!p);
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

export interface RateFilter {
	ltv?: number;
	buyerType?: BuyerType;
	ber?: BerRating;
	lenderId?: string;
	type?: "fixed" | "variable";
	fixedTerm?: number;
	currentLender?: string; // User's current mortgage lender (for newBusiness filtering)
}

/**
 * Filter rates based on criteria
 */
export function filterRates(
	rates: MortgageRate[],
	filter: RateFilter,
): MortgageRate[] {
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

		// Filter by newBusiness based on currentLender
		if (filter.currentLender) {
			const isCurrentLender = rate.lenderId === filter.currentLender;
			if (isCurrentLender) {
				// For current lender: only show existing customer rates (newBusiness: false or undefined)
				if (rate.newBusiness === true) {
					return false;
				}
			} else {
				// For other lenders: only show new business rates (newBusiness: true or undefined)
				if (rate.newBusiness === false) {
					return false;
				}
			}
		}

		return true;
	});
}

/**
 * Get rates sorted by rate (lowest first)
 */
export function getRatesSortedByRate(
	rates: MortgageRate[],
	filter?: RateFilter,
): MortgageRate[] {
	const filtered = filter ? filterRates(rates, filter) : rates;
	return [...filtered].sort((a, b) => a.rate - b.rate);
}

/**
 * Get all unique fixed terms available
 */
export function getAvailableFixedTerms(rates: MortgageRate[]): number[] {
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
