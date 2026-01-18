import { atom, computed } from "nanostores";
import {
	clearHistoryShareParam,
	hasHistoryShareParam,
	parseHistoryShareState,
} from "@/lib/share/rates-history";

// === Types ===

export type HistoryTab = "updates" | "compare" | "trends";

export interface UpdatesFilter {
	lenderIds: string[]; // Empty = all lenders
	startDate: string | null; // ISO date string
	endDate: string | null;
	changeType: "all" | "increase" | "decrease" | "added" | "removed";
}

export interface CompareFilter {
	lenderIds: string[]; // Empty = all lenders
	rateType: string | null; // e.g., "fixed-3" for 3-year fixed, null = all
	ltvRange: [number, number] | null; // e.g., [0, 80]
	buyerCategory: "all" | "pdh" | "btl"; // PDH = FTB/Mover, BTL = Buy to Let
}

export interface TrendsFilter {
	rateType: string | null; // e.g., "fixed-3" for 3-year fixed
	fixedTerm: number | null; // e.g., 3 for 3-year fixed
	ltvRange: [number, number] | null;
	lenderIds: string[]; // Empty = all lenders
	buyerCategory: "all" | "pdh" | "btl"; // PDH = FTB/Mover, BTL = Buy to Let (mutually exclusive)
}

// === Defaults ===

export const DEFAULT_UPDATES_FILTER: UpdatesFilter = {
	lenderIds: [],
	startDate: null,
	endDate: null,
	changeType: "all",
};

export const DEFAULT_COMPARE_FILTER: CompareFilter = {
	lenderIds: [],
	rateType: null,
	ltvRange: null,
	buyerCategory: "all",
};

export const DEFAULT_TRENDS_FILTER: TrendsFilter = {
	rateType: "fixed-4",
	fixedTerm: null,
	ltvRange: [0, 80],
	lenderIds: [],
	buyerCategory: "pdh",
};

// === localStorage Persistence ===

export const HISTORY_FILTERS_KEY = "rates-history-filters";

interface HistoryFiltersPersistedState {
	activeTab: HistoryTab;
	updatesFilter: UpdatesFilter;
	comparisonDate: string | null;
	comparisonEndDate: string | null;
	compareFilter: CompareFilter;
	trendsFilter: TrendsFilter;
	trendsSelectedLenders: string[];
	compareSelectedLender: string;
}

/**
 * Load persisted state from localStorage.
 */
function loadPersistedState(): Partial<HistoryFiltersPersistedState> {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(HISTORY_FILTERS_KEY);
		if (stored) return JSON.parse(stored);
	} catch {
		// Ignore parse errors
	}
	return {};
}

// === Atoms (initialized with defaults for SSR compatibility) ===

export const $historyActiveTab = atom<HistoryTab>("updates");

export const $updatesFilter = atom<UpdatesFilter>(DEFAULT_UPDATES_FILTER);

export const $comparisonDate = atom<string | null>(null);

export const $comparisonEndDate = atom<string | null>(null); // null = today

export const $compareFilter = atom<CompareFilter>(DEFAULT_COMPARE_FILTER);

export const $compareSelectedLender = atom<string>("all");

export const $trendsFilter = atom<TrendsFilter>(DEFAULT_TRENDS_FILTER);

export const $trendsDateRange = atom<{
	startDate: string | null;
	endDate: string | null;
}>({
	startDate: null,
	endDate: null,
});

export const $trendsSelectedLenders = atom<string[]>([]);

// === Persistence ===

// Flag to prevent persisting during share URL import
let persistenceEnabled = true;

function persistHistoryFilters(): void {
	if (typeof window === "undefined" || !persistenceEnabled) return;
	const state: HistoryFiltersPersistedState = {
		activeTab: $historyActiveTab.get(),
		updatesFilter: $updatesFilter.get(),
		comparisonDate: $comparisonDate.get(),
		comparisonEndDate: $comparisonEndDate.get(),
		compareFilter: $compareFilter.get(),
		trendsFilter: $trendsFilter.get(),
		trendsSelectedLenders: $trendsSelectedLenders.get(),
		compareSelectedLender: $compareSelectedLender.get(),
	};
	localStorage.setItem(HISTORY_FILTERS_KEY, JSON.stringify(state));
}

// Subscribe to all stores for auto-persistence
$historyActiveTab.listen(persistHistoryFilters);
$updatesFilter.listen(persistHistoryFilters);
$comparisonDate.listen(persistHistoryFilters);
$comparisonEndDate.listen(persistHistoryFilters);
$compareFilter.listen(persistHistoryFilters);
$trendsFilter.listen(persistHistoryFilters);
$trendsSelectedLenders.listen(persistHistoryFilters);
$compareSelectedLender.listen(persistHistoryFilters);

// === Initialization ===

let filtersInitialized = false;

/**
 * Initialize filters from share URL or localStorage.
 * Call this on page mount. Safe to call multiple times.
 */
export function initializeHistoryFilters(): void {
	if (typeof window === "undefined" || filtersInitialized) return;
	filtersInitialized = true;

	// Check for share URL first (takes priority over localStorage)
	if (hasHistoryShareParam()) {
		const shareState = parseHistoryShareState();
		if (shareState) {
			// Disable persistence while applying share state
			persistenceEnabled = false;

			$historyActiveTab.set(shareState.activeTab);
			$updatesFilter.set(shareState.updatesFilter);
			$comparisonDate.set(shareState.comparisonDate);
			$comparisonEndDate.set(shareState.comparisonEndDate);
			$compareFilter.set(shareState.compareFilter);
			$trendsFilter.set(shareState.trendsFilter);
			$trendsSelectedLenders.set(shareState.trendsSelectedLenders);
			$compareSelectedLender.set(shareState.compareSelectedLender);

			// Re-enable persistence and save the imported state
			persistenceEnabled = true;
			persistHistoryFilters();

			clearHistoryShareParam();
			return;
		}
	}

	// No share URL, restore from localStorage
	const stored = loadPersistedState();
	if (Object.keys(stored).length > 0) {
		persistenceEnabled = false;

		if (stored.activeTab) $historyActiveTab.set(stored.activeTab);
		if (stored.updatesFilter) $updatesFilter.set(stored.updatesFilter);
		if (stored.comparisonDate !== undefined)
			$comparisonDate.set(stored.comparisonDate);
		if (stored.comparisonEndDate !== undefined)
			$comparisonEndDate.set(stored.comparisonEndDate);
		if (stored.compareFilter) $compareFilter.set(stored.compareFilter);
		if (stored.trendsFilter) $trendsFilter.set(stored.trendsFilter);
		if (stored.trendsSelectedLenders)
			$trendsSelectedLenders.set(stored.trendsSelectedLenders);
		if (stored.compareSelectedLender)
			$compareSelectedLender.set(stored.compareSelectedLender);

		persistenceEnabled = true;
	}
}

// === Actions ===

export function setHistoryTab(tab: HistoryTab): void {
	$historyActiveTab.set(tab);
}

export function setUpdatesFilter(filter: Partial<UpdatesFilter>): void {
	$updatesFilter.set({ ...$updatesFilter.get(), ...filter });
}

export function resetUpdatesFilter(): void {
	$updatesFilter.set(DEFAULT_UPDATES_FILTER);
}

export function setComparisonDate(date: string | null): void {
	$comparisonDate.set(date);
}

export function setComparisonEndDate(date: string | null): void {
	$comparisonEndDate.set(date);
}

export function setCompareFilter(filter: Partial<CompareFilter>): void {
	$compareFilter.set({ ...$compareFilter.get(), ...filter });
}

export function resetCompareFilter(): void {
	$compareFilter.set(DEFAULT_COMPARE_FILTER);
}

export function setTrendsFilter(filter: Partial<TrendsFilter>): void {
	$trendsFilter.set({ ...$trendsFilter.get(), ...filter });
}

export function resetTrendsFilter(): void {
	$trendsFilter.set(DEFAULT_TRENDS_FILTER);
}

export function setTrendsDateRange(
	startDate: string | null,
	endDate: string | null,
): void {
	$trendsDateRange.set({ startDate, endDate });
}

export function setTrendsSelectedLenders(lenderIds: string[]): void {
	$trendsSelectedLenders.set(lenderIds);
}

export function setCompareSelectedLender(lenderId: string): void {
	$compareSelectedLender.set(lenderId);
}

// === Computed Values ===

export const $hasUpdatesFilter = computed($updatesFilter, (filter) => {
	return (
		filter.lenderIds.length > 0 ||
		filter.startDate !== null ||
		filter.endDate !== null ||
		filter.changeType !== "all"
	);
});

export const $hasCompareFilter = computed($compareFilter, (filter) => {
	return (
		filter.lenderIds.length > 0 ||
		filter.rateType !== "all" ||
		filter.ltvRange !== null
	);
});

export const $hasTrendsFilter = computed($trendsFilter, (filter) => {
	return (
		filter.rateType !== "fixed-4" ||
		filter.fixedTerm !== null ||
		(filter.ltvRange !== null &&
			(filter.ltvRange[0] !== 0 || filter.ltvRange[1] !== 80)) ||
		filter.lenderIds.length > 0 ||
		filter.buyerCategory !== "pdh"
	);
});

/**
 * Reset state for testing
 * @internal
 */
export function __resetHistoryFiltersState(): void {
	filtersInitialized = false;
	persistenceEnabled = true;
}
