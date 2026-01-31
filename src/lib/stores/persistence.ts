import type { RatesMode } from "@/lib/constants/rates";
import {
    clearCustomShareParam,
    clearRatesShareParam,
    hasCustomShareParam,
    hasRatesShareParam,
    parseCustomShareState,
    parseRatesShareState,
} from "@/lib/share/rates";
import {
    loadRatesForm,
    type RatesFormState,
    saveRatesForm,
} from "@/lib/storage/forms";
import type { StoredCustomPerk } from "./custom-perks";
import { $storedCustomPerks, CUSTOM_PERKS_STORAGE_KEY } from "./custom-perks";
import {
    $storedCustomRates,
    CUSTOM_RATES_STORAGE_KEY,
    type StoredCustomRate,
} from "./custom-rates";
import {
    $compareState,
    COMPARE_STORAGE_KEY,
    loadCompareState,
} from "./rates/rates-compare";
import { $formValues } from "./rates/rates-form";
import {
    $columnFilters,
    $columnVisibility,
    $sorting,
    TABLE_STORAGE_KEYS,
} from "./rates/rates-table";

// Track initialization state
let initialized = false;

/** Result of importing shared custom rates */
export interface ImportResult {
    imported: number;
    skipped: number;
}

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
// Returns import result if custom rates were shared via URL
export function initializeStore(): ImportResult | null {
    if (typeof window === "undefined" || initialized) return null;
    initialized = true;

    let importResult: ImportResult | null = null;

    // If there's a share param, load shared state
    if (hasRatesShareParam()) {
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
            // Read directly from localStorage since the store may not be initialized yet
            if (sharedState.customRates && sharedState.customRates.length > 0) {
                let existingRates: StoredCustomRate[] = [];
                try {
                    const stored = localStorage.getItem(
                        CUSTOM_RATES_STORAGE_KEY,
                    );
                    if (stored) {
                        existingRates = JSON.parse(stored);
                    }
                } catch {
                    // Ignore parse errors
                }

                const existingIds = new Set(existingRates.map((r) => r.id));
                const newRates = sharedState.customRates.filter(
                    (r: StoredCustomRate) => !existingIds.has(r.id),
                );
                const importedCount = newRates.length;
                const skippedCount =
                    sharedState.customRates.length - importedCount;

                const merged = [...existingRates, ...newRates];
                $storedCustomRates.set(merged);
                localStorage.setItem(
                    CUSTOM_RATES_STORAGE_KEY,
                    JSON.stringify(merged),
                );

                // Track import result for toast notification
                importResult = {
                    imported: importedCount,
                    skipped: skippedCount,
                };
            }

            // Merge shared custom perks with existing ones
            // Read directly from localStorage since the store may not be initialized yet
            if (sharedState.customPerks && sharedState.customPerks.length > 0) {
                let existingPerks: StoredCustomPerk[] = [];
                try {
                    const stored = localStorage.getItem(
                        CUSTOM_PERKS_STORAGE_KEY,
                    );
                    if (stored) {
                        existingPerks = JSON.parse(stored);
                    }
                } catch {
                    // Ignore parse errors
                }

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
        return importResult;
    }

    // Check for custom-only share param (?c=)
    if (hasCustomShareParam()) {
        const customState = parseCustomShareState();

        if (customState) {
            // Merge custom rates
            if (customState.customRates && customState.customRates.length > 0) {
                let existingRates: StoredCustomRate[] = [];
                try {
                    const stored = localStorage.getItem(
                        CUSTOM_RATES_STORAGE_KEY,
                    );
                    if (stored) {
                        existingRates = JSON.parse(stored);
                    }
                } catch {
                    // Ignore parse errors
                }

                const existingIds = new Set(existingRates.map((r) => r.id));
                const newRates = customState.customRates.filter(
                    (r: StoredCustomRate) => !existingIds.has(r.id),
                );
                const importedCount = newRates.length;
                const skippedCount =
                    customState.customRates.length - importedCount;

                const merged = [...existingRates, ...newRates];
                $storedCustomRates.set(merged);
                localStorage.setItem(
                    CUSTOM_RATES_STORAGE_KEY,
                    JSON.stringify(merged),
                );

                // Track import result for toast notification
                importResult = {
                    imported: importedCount,
                    skipped: skippedCount,
                };
            }

            // Merge custom perks
            if (customState.customPerks && customState.customPerks.length > 0) {
                let existingPerks: StoredCustomPerk[] = [];
                try {
                    const stored = localStorage.getItem(
                        CUSTOM_PERKS_STORAGE_KEY,
                    );
                    if (stored) {
                        existingPerks = JSON.parse(stored);
                    }
                } catch {
                    // Ignore parse errors
                }

                const existingIds = new Set(existingPerks.map((p) => p.id));
                const newPerks = customState.customPerks.filter(
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

            // Clear URL param after loading
            clearCustomShareParam();
        }
        // Don't return - continue to load form values from localStorage
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

    return importResult;
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
