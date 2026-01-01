import type { RatesMode } from "@/lib/constants";
import {
	loadRatesForm,
	type RatesFormState,
	saveRatesForm,
} from "@/lib/storage";
import { $formValues } from "./form";

// Storage keys for table state (must match RatesTable)
export const TABLE_STORAGE_KEYS = {
	columns: "rates-table-columns",
	sorting: "rates-table-sorting",
	filters: "rates-table-filters",
} as const;

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

// Check if URL has share param
function hasShareParam(): boolean {
	if (typeof window === "undefined") return false;
	return new URLSearchParams(window.location.search).has("s");
}

// Initialize store from localStorage or URL params
export function initializeStore(): void {
	if (typeof window === "undefined" || initialized) return;
	initialized = true;

	// If there's a share param, handle it async (less common case)
	if (hasShareParam()) {
		import("@/components/rates/share").then(
			({ parseRatesShareState, clearRatesShareParam }) => {
				const sharedState = parseRatesShareState();

				if (sharedState) {
					// URL params take priority - load shared state
					$formValues.set(sharedState.input);

					// Save table state to localStorage so RatesTable picks it up
					if (Object.keys(sharedState.table.columnVisibility).length > 0) {
						localStorage.setItem(
							TABLE_STORAGE_KEYS.columns,
							JSON.stringify(sharedState.table.columnVisibility),
						);
					}
					if (sharedState.table.columnFilters.length > 0) {
						localStorage.setItem(
							TABLE_STORAGE_KEYS.filters,
							JSON.stringify(sharedState.table.columnFilters),
						);
					}
					if (sharedState.table.sorting.length > 0) {
						localStorage.setItem(
							TABLE_STORAGE_KEYS.sorting,
							JSON.stringify(sharedState.table.sorting),
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
