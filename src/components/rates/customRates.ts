import type { MortgageRate } from "@/lib/schemas/rate";

/**
 * Stored custom rate - what we save to localStorage
 * Doesn't include isCustom since all rates in custom-rates storage are custom by definition
 */
export interface StoredCustomRate extends MortgageRate {
	customLenderName?: string; // Custom lender name if not using an existing lender
}

/**
 * Custom rate with isCustom flag - used in the app after loading from storage
 */
export interface CustomRate extends StoredCustomRate {
	isCustom: true;
}

/**
 * Check if a rate is a custom rate
 */
export function isCustomRate(
	rate: MortgageRate | CustomRate,
): rate is CustomRate {
	return "isCustom" in rate && rate.isCustom === true;
}

/**
 * Convert stored rates to custom rates (add isCustom flag)
 */
export function hydrateCustomRates(stored: StoredCustomRate[]): CustomRate[] {
	return stored.map((rate) => ({ ...rate, isCustom: true as const }));
}

export const CUSTOM_RATES_STORAGE_KEY = "custom-rates";
