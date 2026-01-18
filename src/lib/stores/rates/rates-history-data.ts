import { atom } from "nanostores";
import { fetchLendersData } from "@/lib/data/fetch";
import { fetchAllHistory } from "@/lib/data/fetch-history";
import type { Lender } from "@/lib/schemas/lender";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";

/**
 * Shared data store for history page
 *
 * Provides centralized data fetching with deduplication to avoid
 * multiple fetches when switching between tabs or re-mounting islands.
 */

export interface HistoryDataState {
	loading: boolean;
	error: string | null;
	historyData: Map<string, RatesHistoryFile>;
	lenders: Lender[];
}

const DEFAULT_STATE: HistoryDataState = {
	loading: true,
	error: null,
	historyData: new Map(),
	lenders: [],
};

// Main data state atom
export const $historyDataState = atom<HistoryDataState>(DEFAULT_STATE);

// Track if data has been loaded or is currently loading
let dataLoadPromise: Promise<void> | null = null;

/**
 * Load history data with deduplication.
 * Safe to call multiple times - will only fetch once.
 */
export async function loadHistoryData(): Promise<void> {
	// If already loading, wait for existing promise
	if (dataLoadPromise) {
		return dataLoadPromise;
	}

	// If already loaded successfully, return immediately
	const current = $historyDataState.get();
	if (!current.loading && current.historyData.size > 0) {
		return;
	}

	// Start loading
	$historyDataState.set({
		...current,
		loading: true,
		error: null,
	});

	dataLoadPromise = (async () => {
		try {
			// First fetch lenders, then history (history needs lenders)
			const lenderData = await fetchLendersData();
			const history = await fetchAllHistory(lenderData);

			$historyDataState.set({
				loading: false,
				error: null,
				historyData: history,
				lenders: lenderData,
			});
		} catch (_err) {
			$historyDataState.set({
				loading: false,
				error: "Failed to load historical data",
				historyData: new Map(),
				lenders: [],
			});
		}
	})();

	return dataLoadPromise;
}

/**
 * Check if data has been loaded
 */
export function isHistoryDataLoaded(): boolean {
	const state = $historyDataState.get();
	return !state.loading && state.historyData.size > 0;
}

/**
 * Reset data state (for testing)
 * @internal
 */
export function __resetHistoryDataState(): void {
	dataLoadPromise = null;
	$historyDataState.set(DEFAULT_STATE);
}
