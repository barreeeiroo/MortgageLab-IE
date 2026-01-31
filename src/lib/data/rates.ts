/**
 * Rate data fetching and filtering utilities.
 */

import type { BuyerType } from "@/lib/schemas/buyer";
import type { Lender } from "@/lib/schemas/lender";
import {
    type BerRating,
    type MortgageRate,
    type RatesFile,
    RatesFileSchema,
    type RatesMetadata,
    type RateType,
} from "@/lib/schemas/rate";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch rates data for a specific lender.
 * @param lenderId - The lender ID to fetch rates for
 * @returns Object containing rates array and metadata, or empty rates on error
 */
export async function fetchLenderRates(
    lenderId: string,
): Promise<{ rates: MortgageRate[]; metadata: RatesMetadata | null }> {
    try {
        const res = await fetch(getPath(`data/rates/${lenderId}.json`));
        if (!res.ok) {
            return { rates: [], metadata: null };
        }
        const json = await res.json();
        const ratesFile: RatesFile = RatesFileSchema.parse(json);
        return {
            rates: ratesFile.rates,
            metadata: {
                lenderId: ratesFile.lenderId,
                lastScrapedAt: ratesFile.lastScrapedAt,
                lastUpdatedAt: ratesFile.lastUpdatedAt,
            },
        };
    } catch {
        return { rates: [], metadata: null };
    }
}

/**
 * Fetch all rates data for all lenders.
 * @param lenders - Array of lenders to fetch rates for
 * @returns Object containing all rates and metadata arrays
 */
export async function fetchAllRates(lenders: Lender[]): Promise<{
    rates: MortgageRate[];
    metadata: RatesMetadata[];
}> {
    const results = await Promise.all(
        lenders.map((lender) => fetchLenderRates(lender.id)),
    );

    return {
        rates: results.flatMap((r) => r.rates),
        metadata: results
            .map((r) => r.metadata)
            .filter((m): m is RatesMetadata => m !== null),
    };
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
