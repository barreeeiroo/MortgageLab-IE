import type { RatesMode } from "@/lib/constants";
import type { StoredCustomPerk } from "./custom-perks";
import { hasRatesShareParam } from "@/lib/share";
import {
	loadRatesForm,
	type RatesFormState,
	saveRatesForm,
} from "@/lib/storage";
import {
	$compareState,
	COMPARE_STORAGE_KEY,
	loadCompareState,
} from "./compare";
import {
	$storedCustomPerks,
	CUSTOM_PERKS_STORAGE_KEY,
} from "./custom-perks";
import {
	$storedCustomRates,
	CUSTOM_RATES_STORAGE_KEY,
	type StoredCustomRate,
} from "./custom-rates";
import { $formValues } from "./rates-form";
import {
	$columnFilters,
	$columnVisibility,
	$sorting,
	TABLE_STORAGE_KEYS,
} from "./rates-table";

// Track initialization state
let initialized = false;

// Get mode from URL hash
function getModeFromHash(): RatesMode | null {
	if (typeof window === "undefined") return null;
	const hash = window.location.hash.slice(1);
	if (hash === "first-mortgage" || hash === "remortgage") {
		return hash;
	}
	return null;
}

// Initialize store from localStorage or URL params
export function initializeStore(): void {
	if (typeof window === "undefined" || initialized) return;
	initialized = true;

	// If there's a share param, handle it async (less common case)
	if (hasRatesShareParam()) {
		import("@/lib/share").then(
			({ parseRatesShareState, clearRatesShareParam }) => {
				const sharedState = parseRatesShareState();

				if (sharedState) {
					// URL params take priority - load shared state
					$formValues.set(sharedState.input);

					// Update table state atoms and persist to localStorage
					if (Object.keys(sharedState.table.columnVisibility).length > 0) {
						$columnVisibility.set(sharedState.table.columnVisibility);
						localStorage.setItem(
							TABLE_STORAGE_KEYS.columns,
							JSON.stringify(sharedState.table.columnVisibility),
						);
					}
					if (sharedState.table.columnFilters.length > 0) {
						$columnFilters.set(sharedState.table.columnFilters);
						localStorage.setItem(
							TABLE_STORAGE_KEYS.filters,
							JSON.stringify(sharedState.table.columnFilters),
						);
					}
					if (sharedState.table.sorting.length > 0) {
						$sorting.set(sharedState.table.sorting);
						localStorage.setItem(
							TABLE_STORAGE_KEYS.sorting,
							JSON.stringify(sharedState.table.sorting),
						);
					}

					// Merge shared custom rates with existing ones
					if (sharedState.customRates && sharedState.customRates.length > 0) {
						const existingRates = $storedCustomRates.get();
						const existingIds = new Set(existingRates.map((r) => r.id));
						const newRates = sharedState.customRates.filter(
							(r: StoredCustomRate) => !existingIds.has(r.id),
						);
						if (newRates.length > 0) {
							const merged = [...existingRates, ...newRates];
							$storedCustomRates.set(merged);
							localStorage.setItem(
								CUSTOM_RATES_STORAGE_KEY,
								JSON.stringify(merged),
							);
						}
					}

					// Merge shared custom perks with existing ones
					if (sharedState.customPerks && sharedState.customPerks.length > 0) {
						const existingPerks = $storedCustomPerks.get();
						const existingIds = new Set(existingPerks.map((p) => p.id));
						const newPerks = sharedState.customPerks.filter(
							(p: StoredCustomPerk) => !existingIds.has(p.id),
						);
						if (newPerks.length > 0) {
							const merged = [...existingPerks, ...newPerks];
							$storedCustomPerks.set(merged);
							localStorage.setItem(
								CUSTOM_PERKS_STORAGE_KEY,
								JSON.stringify(merged),
							);
						}
					}

					// Load compare state if present and persist to localStorage
					if (sharedState.compare && sharedState.compare.rateIds.length > 0) {
						const compareState = {
							selectedRateIds: sharedState.compare.rateIds,
							isOpen: true,
						};
						$compareState.set(compareState);
						localStorage.setItem(
							COMPARE_STORAGE_KEY,
							JSON.stringify(compareState),
						);
					}

					// Clear URL params after loading
					clearRatesShareParam();
				}
			},
		);
		return;
	}

	// Synchronous path for normal page loads (most common case)
	const saved = loadRatesForm();
	const hashMode = getModeFromHash();
	const current = $formValues.get();

	$formValues.set({
		...current,
		mode: hashMode ?? saved.mode ?? current.mode,
		propertyValue: saved.propertyValue ?? current.propertyValue,
		mortgageAmount: saved.mortgageAmount ?? current.mortgageAmount,
		monthlyRepayment: saved.monthlyRepayment ?? current.monthlyRepayment,
		mortgageTerm: saved.mortgageTerm ?? current.mortgageTerm,
		berRating: saved.berRating ?? current.berRating,
		buyerType: saved.buyerType ?? current.buyerType,
		currentLender: saved.currentLender ?? current.currentLender,
	});

	// Load compare state from localStorage
	const savedCompareState = loadCompareState();
	if (
		savedCompareState.selectedRateIds.length > 0 ||
		savedCompareState.isOpen
	) {
		$compareState.set(savedCompareState);
	}
}

// Save form values to localStorage
export function persistFormValues(): void {
	const values = $formValues.get();
	saveRatesForm(values as RatesFormState);
}

// Update URL hash when mode changes
export function updateUrlHash(): void {
	if (typeof window === "undefined") return;
	const mode = $formValues.get().mode;
	window.history.replaceState(null, "", `#${mode}`);
}
