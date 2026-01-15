import { atom, computed } from "nanostores";
import type { SaveableSimulationState } from "@/lib/schemas/simulate";
import {
	clearCompareShareParam,
	hasCompareShareParam,
	parseCompareShareState,
} from "@/lib/share/simulate-compare";
import { formatCurrency } from "@/lib/utils/currency";
import { mergeCustomRates } from "../custom-rates";
import {
	$savedSimulations,
	extractSaveableState,
	generateSaveId,
} from "./simulate-saves";
import { $hasRequiredData, $simulationState } from "./simulate-state";

// localStorage key for compare state
export const COMPARE_STATE_KEY = "simulate-compare-state";

// Special marker for the current (potentially unsaved) simulation
export const CURRENT_SIMULATION_ID = "__current__";

/**
 * Compare state structure
 */
export interface CompareState {
	savedIds: string[]; // IDs of saved simulations to compare
	includeCurrentView: boolean; // Whether to include the current (potentially unsaved) simulation
	displayStartDate?: string; // Optional unified display start date for all simulations (ISO date string "2025-02-01")
}

/**
 * Resolved simulation for comparison
 */
export interface ResolvedCompareSimulation {
	id: string; // Saved ID or '__current__'
	name: string; // Save name or "Current Simulation"
	state: SaveableSimulationState;
	isCurrentView: boolean; // true if this is the unsaved current simulation
}

/**
 * Validation result for comparison
 */
export interface CompareValidation {
	isValid: boolean;
	errors: Array<{
		type: "insufficient_simulations";
		message: string;
	}>;
	warnings: Array<{
		type: "self_build_mix" | "different_property_values";
		message: string;
		details?: string;
	}>;
	infos: Array<{
		type: "overpayment_mix";
		message: string;
		details?: string;
	}>;
}

// Default compare state
const DEFAULT_COMPARE_STATE: CompareState = {
	savedIds: [],
	includeCurrentView: false,
	displayStartDate: undefined,
};

// Main compare state atom - persisted to localStorage
export const $compareState = atom<CompareState>(DEFAULT_COMPARE_STATE);

// Track initialization
let compareInitialized = false;

/**
 * Persist compare state to localStorage
 */
function persistCompareState(state: CompareState): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(COMPARE_STATE_KEY, JSON.stringify(state));
	}
}

/**
 * Load compare state from localStorage
 */
function loadCompareState(): CompareState {
	if (typeof window === "undefined") return DEFAULT_COMPARE_STATE;

	try {
		const stored = localStorage.getItem(COMPARE_STATE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			if (
				Array.isArray(parsed.savedIds) &&
				typeof parsed.includeCurrentView === "boolean"
			) {
				return {
					savedIds: parsed.savedIds,
					includeCurrentView: parsed.includeCurrentView,
					displayStartDate: parsed.displayStartDate,
				};
			}
		}
	} catch {
		// Ignore parse errors
	}
	return DEFAULT_COMPARE_STATE;
}

/**
 * Result of importing shared comparison
 */
export interface ImportCompareResult {
	imported: number;
	skipped: number;
}

/**
 * Import a shared comparison from URL
 * Adds simulations to saved simulations and sets up compare state
 */
export function importSharedComparison(): ImportCompareResult | null {
	if (!hasCompareShareParam()) return null;

	const shareState = parseCompareShareState();
	if (!shareState || shareState.simulations.length === 0) {
		clearCompareShareParam();
		return null;
	}

	const savedSims = [...$savedSimulations.get()];
	const importedIds: string[] = [];
	const skipped = 0;

	for (const shared of shareState.simulations) {
		// Generate new ID for simulations that were the sharer's "current view"
		const importId = shared.isCurrentView ? generateSaveId() : shared.id;

		// Check if ID already exists
		const existingIndex = savedSims.findIndex((s) => s.id === importId);

		if (existingIndex >= 0) {
			// OVERWRITE: Same ID exists → replace with shared state
			savedSims[existingIndex] = {
				...savedSims[existingIndex],
				state: shared.state,
				lastUpdatedAt: new Date().toISOString(),
			};
		} else {
			// NEW: Add as new saved simulation
			// Handle name collision by appending "(imported)" if needed
			let name = shared.name;
			if (shared.isCurrentView) {
				// Rename "Shared Simulation" to something more descriptive
				name = `Shared Simulation ${new Date().toLocaleDateString()}`;
			}
			if (savedSims.some((s) => s.name === name)) {
				name = `${name} (imported)`;
			}

			savedSims.push({
				id: importId,
				name,
				state: shared.state,
				createdAt: new Date().toISOString(),
				lastUpdatedAt: new Date().toISOString(),
			});
		}

		// Import custom rates (overwrite by ID)
		if (shared.customRates.length > 0) {
			mergeCustomRates(shared.customRates);
		}

		importedIds.push(importId);
	}

	// Save updated simulations
	$savedSimulations.set(savedSims);
	if (typeof window !== "undefined") {
		localStorage.setItem("simulate-saves", JSON.stringify(savedSims));
	}

	// Set compare state to the imported ones (all as saved, none as current view)
	const newCompareState: CompareState = {
		savedIds: importedIds,
		includeCurrentView: false,
	};
	$compareState.set(newCompareState);
	persistCompareState(newCompareState);

	// Clear URL param
	clearCompareShareParam();

	return {
		imported: importedIds.length,
		skipped,
	};
}

/**
 * Initialize compare state from localStorage or shared URL
 * Call this on page mount
 */
export function initializeCompareState(): void {
	if (typeof window === "undefined" || compareInitialized) return;
	compareInitialized = true;

	// Check for shared comparison URL first
	if (hasCompareShareParam()) {
		const result = importSharedComparison();
		if (result && result.imported > 0) {
			// Successfully imported from share URL, we're done
			return;
		}
	}

	// No share URL, load from localStorage
	const stored = loadCompareState();

	// Clean up savedIds that no longer exist in saved simulations
	const savedSims = $savedSimulations.get();
	const validIds = stored.savedIds.filter((id) =>
		savedSims.some((s) => s.id === id),
	);

	// If includeCurrentView is true but current simulation has no data, disable it
	const hasCurrentData = $hasRequiredData.get();
	const includeCurrentView = stored.includeCurrentView && hasCurrentData;

	const cleanedState: CompareState = {
		savedIds: validIds,
		includeCurrentView,
		displayStartDate: stored.displayStartDate,
	};

	$compareState.set(cleanedState);

	// Persist cleaned state if it changed
	if (
		validIds.length !== stored.savedIds.length ||
		includeCurrentView !== stored.includeCurrentView
	) {
		persistCompareState(cleanedState);
	}
}

// Subscribe to auto-persist state changes
$compareState.listen((state) => {
	if (compareInitialized) {
		persistCompareState(state);
	}
});

// Computed: total number of simulations selected for comparison
export const $compareSelectionCount = computed($compareState, (state) => {
	return state.savedIds.length + (state.includeCurrentView ? 1 : 0);
});

// Computed: can add more simulations to compare (max 5)
export const $canAddMoreToCompare = computed(
	$compareSelectionCount,
	(count) => count < 5,
);

// Computed: resolved simulations for comparison
export const $compareSimulations = computed(
	[$compareState, $savedSimulations, $simulationState],
	(compareState, savedSims, currentState): ResolvedCompareSimulation[] => {
		const result: ResolvedCompareSimulation[] = [];

		// Add saved simulations
		for (const id of compareState.savedIds) {
			const sim = savedSims.find((s) => s.id === id);
			if (sim) {
				result.push({
					id: sim.id,
					name: sim.name,
					state: sim.state,
					isCurrentView: false,
				});
			}
		}

		// Add current view if selected and has data
		if (compareState.includeCurrentView && currentState.initialized) {
			const hasData =
				currentState.input.mortgageAmount > 0 &&
				currentState.input.mortgageTermMonths > 0 &&
				currentState.input.propertyValue > 0 &&
				currentState.ratePeriods.length > 0;

			if (hasData) {
				result.push({
					id: CURRENT_SIMULATION_ID,
					name: "Unnamed Simulation",
					state: extractSaveableState(currentState),
					isCurrentView: true,
				});
			}
		}

		return result;
	},
);

// Computed: validation result for comparison
export const $compareValidation = computed(
	$compareSimulations,
	(sims): CompareValidation => {
		// Error: Less than 2 simulations
		if (sims.length < 2) {
			return {
				isValid: false,
				errors: [
					{
						type: "insufficient_simulations",
						message: "Select at least 2 simulations to compare",
					},
				],
				warnings: [],
				infos: [],
			};
		}

		// Warnings (all allow comparison to proceed)
		const warnings: CompareValidation["warnings"] = [];
		const infos: CompareValidation["infos"] = [];

		// Warning: Mix of self-build and non-self-build
		const hasSelfBuild = sims.some((s) => s.state.selfBuildConfig?.enabled);
		const hasNonSelfBuild = sims.some((s) => !s.state.selfBuildConfig?.enabled);
		if (hasSelfBuild && hasNonSelfBuild) {
			warnings.push({
				type: "self_build_mix",
				message: "Comparing self-build and standard mortgages",
			});
		}

		// Warning: Different property values
		const propertyValues = sims.map((s) => s.state.input.propertyValue);
		const uniquePropertyValues = new Set(propertyValues);
		if (uniquePropertyValues.size > 1) {
			const min = Math.min(...propertyValues);
			const max = Math.max(...propertyValues);
			warnings.push({
				type: "different_property_values",
				message: "Property values vary",
				details: `${formatCurrency(min)} - ${formatCurrency(max)}`,
			});
		}

		// Info: Mix of overpayments and no overpayments (only for 2 simulations with identical inputs)
		if (sims.length === 2) {
			const hasOverpayments = sims.some(
				(s) => s.state.overpaymentConfigs.length > 0,
			);
			const hasNoOverpayments = sims.some(
				(s) => s.state.overpaymentConfigs.length === 0,
			);

			// Check if states are identical except for overpayments
			const statesMatchExceptOverpayments = (() => {
				const { overpaymentConfigs: _, ...state1 } = sims[0].state;
				const { overpaymentConfigs: __, ...state2 } = sims[1].state;
				return JSON.stringify(state1) === JSON.stringify(state2);
			})();

			if (
				hasOverpayments &&
				hasNoOverpayments &&
				statesMatchExceptOverpayments
			) {
				infos.push({
					type: "overpayment_mix",
					message: "Overpayment impact visualization available",
					details:
						"View individual simulations to see detailed overpayment impact charts",
				});
			}
		}

		return { isValid: true, errors: [], warnings, infos };
	},
);

// Computed: whether we have a valid comparison
export const $hasValidComparison = computed(
	$compareValidation,
	(validation) => validation.isValid,
);

// Computed: whether at least 2 saved simulations exist (for empty state button)
export const $canCompareFromEmptyState = computed(
	$savedSimulations,
	(saves) => saves.length >= 2,
);

// Actions

/**
 * Set the full compare state
 */
export function setCompareState(state: CompareState): void {
	// Limit to max 5 total
	const totalCount = state.savedIds.length + (state.includeCurrentView ? 1 : 0);
	if (totalCount > 5) {
		// Trim savedIds if needed
		const maxSavedIds = state.includeCurrentView ? 4 : 5;
		state = {
			...state,
			savedIds: state.savedIds.slice(0, maxSavedIds),
		};
	}
	$compareState.set(state);
}

/**
 * Add a saved simulation to comparison
 */
export function addSavedToCompare(id: string): void {
	const current = $compareState.get();
	const totalCount =
		current.savedIds.length + (current.includeCurrentView ? 1 : 0);

	// Check max limit
	if (totalCount >= 5) return;

	// Check if already added
	if (current.savedIds.includes(id)) return;

	// Check if simulation exists
	const savedSims = $savedSimulations.get();
	if (!savedSims.some((s) => s.id === id)) return;

	$compareState.set({
		...current,
		savedIds: [...current.savedIds, id],
	});
}

/**
 * Remove a saved simulation from comparison
 */
export function removeSavedFromCompare(id: string): void {
	const current = $compareState.get();
	$compareState.set({
		...current,
		savedIds: current.savedIds.filter((savedId) => savedId !== id),
	});
}

/**
 * Toggle the current simulation in comparison
 */
export function toggleCurrentInCompare(): void {
	const current = $compareState.get();

	// If trying to add current, check max limit
	if (!current.includeCurrentView) {
		const totalCount = current.savedIds.length + 1;
		if (totalCount > 5) return;

		// Check if current simulation has data
		if (!$hasRequiredData.get()) return;
	}

	$compareState.set({
		...current,
		includeCurrentView: !current.includeCurrentView,
	});
}

/**
 * Set whether current simulation is included
 */
export function setCurrentInCompare(include: boolean): void {
	const current = $compareState.get();

	if (include) {
		// Check max limit
		const totalCount = current.savedIds.length + 1;
		if (totalCount > 5) return;

		// Check if current simulation has data
		if (!$hasRequiredData.get()) return;
	}

	$compareState.set({
		...current,
		includeCurrentView: include,
	});
}

/**
 * Clear all compare selections
 */
export function clearCompare(): void {
	$compareState.set(DEFAULT_COMPARE_STATE);
}

/**
 * Set the display start date for all simulations in comparison
 */
export function setCompareDisplayStartDate(date: string | undefined): void {
	const current = $compareState.get();
	$compareState.set({
		...current,
		displayStartDate: date,
	});
}

/**
 * Check if a saved simulation is selected for comparison
 */
export function isSavedInCompare(id: string): boolean {
	return $compareState.get().savedIds.includes(id);
}

/**
 * Check if current simulation is selected for comparison
 */
export function isCurrentInCompare(): boolean {
	return $compareState.get().includeCurrentView;
}

// Navigation helpers

/**
 * Navigate to compare page
 */
export function navigateToCompare(): void {
	if (typeof window === "undefined") return;
	window.location.href = "/simulate/compare";
}

/**
 * Navigate to simulate page
 */
export function navigateToSimulate(): void {
	if (typeof window === "undefined") return;
	window.location.href = "/simulate";
}

/**
 * Reset compare state initialization flag (for testing only)
 * @internal
 */
export function __resetCompareInitialized(): void {
	compareInitialized = false;
}
