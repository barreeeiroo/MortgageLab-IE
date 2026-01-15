import { atom } from "nanostores";

/**
 * Compare rates state - tracks selected rate IDs and modal open state
 */

export const COMPARE_STORAGE_KEY = "rates-table-compare";

export interface CompareState {
	selectedRateIds: string[];
	isOpen: boolean;
}

const DEFAULT_COMPARE_STATE: CompareState = {
	selectedRateIds: [],
	isOpen: false,
};

export const $compareState = atom<CompareState>(DEFAULT_COMPARE_STATE);

/**
 * Load compare state from localStorage
 */
export function loadCompareState(): CompareState {
	if (typeof window === "undefined") return DEFAULT_COMPARE_STATE;

	try {
		const stored = localStorage.getItem(COMPARE_STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored) as CompareState;
			return {
				selectedRateIds: parsed.selectedRateIds ?? [],
				isOpen: parsed.isOpen ?? false,
			};
		}
	} catch {
		// Invalid JSON, return default
	}
	return DEFAULT_COMPARE_STATE;
}

/**
 * Save compare state to localStorage
 */
export function saveCompareState(state: CompareState): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage full or not available
	}
}

/**
 * Set the compare state and persist to localStorage
 */
export function setCompareState(state: Partial<CompareState>): void {
	const newState = {
		...$compareState.get(),
		...state,
	};
	$compareState.set(newState);
	saveCompareState(newState);
}

/**
 * Reset compare state to default
 */
export function resetCompareState(): void {
	$compareState.set(DEFAULT_COMPARE_STATE);
	saveCompareState(DEFAULT_COMPARE_STATE);
}
