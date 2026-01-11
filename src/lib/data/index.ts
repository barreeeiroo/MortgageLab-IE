import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import type { OverpaymentPolicy } from "@/lib/schemas/overpayment-policy";
import type { Perk } from "@/lib/schemas/perk";
import type { BerRating, MortgageRate, RateType } from "@/lib/schemas/rate";

/**
 * Get a perk by ID from a perks array
 */
export function getPerk(perks: Perk[], id: string): Perk | undefined {
	return perks.find((p) => p.id === id);
}

/**
 * Resolve an array of perk IDs to full Perk objects
 */
export function resolvePerks(perks: Perk[], perkIds: string[]): Perk[] {
	const perkMap = new Map<string, Perk>(perks.map((perk) => [perk.id, perk]));
	return perkIds.map((id) => perkMap.get(id)).filter((p): p is Perk => !!p);
}

/**
 * Get an overpayment policy by ID from a policies array
 */
export function getOverpaymentPolicy(
	policies: OverpaymentPolicy[],
	id: string,
): OverpaymentPolicy | undefined {
	return policies.find((p) => p.id === id);
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
	type?: RateType;
	fixedTerm?: number;
	currentLender?: string; // User's current mortgage lender (for newBusiness filtering)
	mortgageAmount?: number; // Mortgage amount in EUR (for minLoan filtering)
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

		// Filter by minimum loan amount
		if (
			filter.mortgageAmount !== undefined &&
			rate.minLoan !== undefined &&
			filter.mortgageAmount < rate.minLoan
		) {
			return false;
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
		} else {
			// No current lender (new mortgage): exclude existing customer only rates
			if (rate.newBusiness === false) {
				return false;
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
