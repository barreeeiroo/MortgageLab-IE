import { atom, computed } from "nanostores";
import type { BerRating } from "@/lib/constants/ber";
import { DEFAULT_MAX_TERM } from "@/lib/schemas/lender";
import type { MortgageRate } from "@/lib/schemas/rate";
import { $lenders } from "./lenders";
import { $formValues, $ltv, $mortgageTerm } from "./rates-form";

/**
 * Stored custom rate - what we save to localStorage
 * Doesn't include isCustom since all rates in custom-rates storage are custom by definition
 */
export interface StoredCustomRate extends MortgageRate {
	customLenderName?: string; // Custom lender name if not using an existing lender
	createdAt?: string; // ISO date string
	lastUpdatedAt?: string; // ISO date string
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

// Atom for stored custom rates (raw from localStorage)
export const $storedCustomRates = atom<StoredCustomRate[]>([]);

// Track initialization
let customRatesInitialized = false;

// Initialize custom rates from localStorage
export function initializeCustomRates(): void {
	if (typeof window === "undefined" || customRatesInitialized) return;
	customRatesInitialized = true;

	try {
		const stored = localStorage.getItem(CUSTOM_RATES_STORAGE_KEY);
		if (stored) {
			$storedCustomRates.set(JSON.parse(stored));
		}
	} catch {
		// Ignore parse errors, use empty array
	}
}

// Computed: hydrated custom rates with isCustom flag
export const $customRates = computed($storedCustomRates, (stored) =>
	hydrateCustomRates(stored),
);

// Computed: filtered custom rates based on current input values
export const $filteredCustomRates = computed(
	[$customRates, $ltv, $formValues, $lenders, $mortgageTerm],
	(customRates, ltv, values, lenders, mortgageTerm) => {
		const lenderMap = new Map(lenders.map((l) => [l.id, l]));

		return customRates.filter((rate) => {
			// Filter by LTV
			if (ltv < rate.minLtv || ltv > rate.maxLtv) return false;
			// Filter by buyer type
			if (
				!rate.buyerTypes.includes(
					values.buyerType as MortgageRate["buyerTypes"][number],
				)
			)
				return false;
			// Filter by BER rating
			if (values.berRating && rate.berEligible) {
				if (!rate.berEligible.includes(values.berRating as BerRating))
					return false;
			}
			// Filter by lender's maxTerm (if using a known lender)
			const lender = lenderMap.get(rate.lenderId);
			const maxTermMonths = (lender?.maxTerm ?? DEFAULT_MAX_TERM) * 12;
			if (mortgageTerm > maxTermMonths) return false;

			return true;
		});
	},
);

// Extract unique custom lenders from stored custom rates
export const $customLenders = computed($storedCustomRates, (storedRates) => {
	const lenderMap = new Map<string, string>();
	for (const rate of storedRates) {
		if (rate.customLenderName) {
			lenderMap.set(rate.lenderId, rate.customLenderName);
		}
	}
	return Array.from(lenderMap.entries()).map(([id, name]) => ({ id, name }));
});

// Actions
export function addCustomRate(rate: StoredCustomRate): void {
	const now = new Date().toISOString();
	const rateWithTimestamps: StoredCustomRate = {
		...rate,
		createdAt: now,
		lastUpdatedAt: now,
	};
	const current = $storedCustomRates.get();
	const updated = [...current, rateWithTimestamps];
	$storedCustomRates.set(updated);
	persistCustomRates(updated);
}

export function removeCustomRate(rateId: string): void {
	const current = $storedCustomRates.get();
	const updated = current.filter((r) => r.id !== rateId);
	$storedCustomRates.set(updated);
	persistCustomRates(updated);
}

export function updateCustomRate(rate: StoredCustomRate): void {
	const current = $storedCustomRates.get();
	const updated = current.map((r) =>
		r.id === rate.id
			? {
					...rate,
					createdAt: r.createdAt,
					lastUpdatedAt: new Date().toISOString(),
				}
			: r,
	);
	$storedCustomRates.set(updated);
	persistCustomRates(updated);
}

export function clearCustomRates(): void {
	$storedCustomRates.set([]);
	persistCustomRates([]);
}

function persistCustomRates(rates: StoredCustomRate[]): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(CUSTOM_RATES_STORAGE_KEY, JSON.stringify(rates));
	}
}
