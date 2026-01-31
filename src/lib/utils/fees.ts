// Stamp Duty for residential property in Ireland
// 1% up to €1M, 2% from €1M to €1.5M, 6% above €1.5M (cumulative)
export function calculateStampDuty(propertyValue: number): number {
    if (propertyValue <= 0) return 0;

    let stampDuty = 0;
    const tier1Limit = 1_000_000;
    const tier2Limit = 1_500_000;

    if (propertyValue <= tier1Limit) {
        stampDuty = propertyValue * 0.01;
    } else if (propertyValue <= tier2Limit) {
        stampDuty = tier1Limit * 0.01 + (propertyValue - tier1Limit) * 0.02;
    } else {
        stampDuty =
            tier1Limit * 0.01 +
            (tier2Limit - tier1Limit) * 0.02 +
            (propertyValue - tier2Limit) * 0.06;
    }

    return stampDuty;
}

// Estimated legal fees (solicitor, searches, registration, etc.)
export const ESTIMATED_LEGAL_FEES = 4000;

// Estimated legal fees for remortgage/switching (includes all outlays)
export const ESTIMATED_REMORTGAGE_LEGAL_FEES = 1350;

// Property VAT rates in Ireland (2025-2030)
// New builds: 13.5%, New apartments: 9% (reduced until Dec 2030), Existing: 0%
export const VAT_RATE_NEW_BUILD = 13.5;
export const VAT_RATE_NEW_APARTMENT = 9;
export const VAT_RATE_EXISTING = 0;

export type PropertyType = "existing" | "new-build" | "new-apartment";

export interface PropertyVATResult {
    vatAmount: number;
    netPrice: number;
    grossPrice: number;
    vatRate: number;
}

/**
 * Calculate property VAT based on property type and whether price includes VAT.
 * - Existing properties: No VAT
 * - New builds from developers: 13.5% VAT
 * - New apartments: 9% VAT (reduced rate until Dec 2030)
 */
export function calculatePropertyVAT(
    propertyValue: number,
    propertyType: PropertyType,
    priceIncludesVAT: boolean,
): PropertyVATResult {
    const vatRate =
        propertyType === "new-build"
            ? VAT_RATE_NEW_BUILD
            : propertyType === "new-apartment"
              ? VAT_RATE_NEW_APARTMENT
              : VAT_RATE_EXISTING;

    if (vatRate === 0 || propertyValue <= 0) {
        return {
            vatAmount: 0,
            netPrice: propertyValue,
            grossPrice: propertyValue,
            vatRate: 0,
        };
    }

    const rate = vatRate / 100;

    if (priceIncludesVAT) {
        // Extract VAT from inclusive price
        const netPrice = propertyValue / (1 + rate);
        const vatAmount = propertyValue - netPrice;
        return {
            vatAmount,
            netPrice,
            grossPrice: propertyValue,
            vatRate,
        };
    }

    // Add VAT to exclusive price
    const vatAmount = propertyValue * rate;
    const grossPrice = propertyValue + vatAmount;
    return {
        vatAmount,
        netPrice: propertyValue,
        grossPrice,
        vatRate,
    };
}
