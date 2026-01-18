import { atom, computed } from "nanostores";
import {
	clearHistoryShareParam,
	hasHistoryShareParam,
	parseHistoryShareState,
} from "@/lib/share/rates-history";

// === Types ===

export type HistoryTab = "updates" | "changes" | "trends";

export interface UpdatesFilter {
	lenderIds: string[]; // Empty = all lenders
	startDate: string | null; // ISO date string
	endDate: string | null;
	changeType: "all" | "increase" | "decrease" | "added" | "removed";
}

export interface ChangesFilter {
	lenderIds: string[]; // Empty = all lenders
	rateType: string | null; // e.g., "fixed-3" for 3-year fixed, null = all
	ltvRange: [number, number] | null; // e.g., [0, 80]
	buyerCategory: "all" | "pdh" | "btl"; // PDH = FTB/Mover, BTL = Buy to Let
}

export type TrendsDisplayMode = "individual" | "market-overview";
export type MarketChartStyle = "average" | "range-band" | "grouped";
export type TrendsBreakdownDimension =
	| "lender"
	| "rate-type"
	| "ltv"
	| "buyer-type";

export interface TrendsFilter {
	rateType: string | null; // e.g., "fixed-3" for 3-year fixed
	fixedTerm: number | null; // e.g., 3 for 3-year fixed
	ltvRange: [number, number] | null;
	lenderIds: string[]; // Empty = all lenders
	buyerCategory: "all" | "pdh" | "btl"; // PDH = FTB/Mover, BTL = Buy to Let (mutually exclusive)
	displayMode: TrendsDisplayMode;
	marketChartStyle: MarketChartStyle;
	breakdownBy: TrendsBreakdownDimension[]; // Empty = overall, multiple = compound grouping
}

// === Defaults ===

export const DEFAULT_UPDATES_FILTER: UpdatesFilter = {
	lenderIds: [],
	startDate: null,
	endDate: null,
	changeType: "all",
};

export const DEFAULT_CHANGES_FILTER: ChangesFilter = {
	lenderIds: [],
	rateType: null,
	ltvRange: null,
	buyerCategory: "all",
};

export const DEFAULT_TRENDS_FILTER: TrendsFilter = {
	rateType: "fixed-4",
	fixedTerm: null,
	ltvRange: null, // All LTV
	lenderIds: [],
	buyerCategory: "pdh",
	displayMode: "market-overview",
	marketChartStyle: "grouped",
	breakdownBy: ["lender"],
};

// === localStorage Persistence ===

export const HISTORY_FILTERS_KEY = "rates-history-filters";

interface HistoryFiltersPersistedState {
	activeTab: HistoryTab;
	updatesFilter: UpdatesFilter;
	comparisonDate: string | null;
	comparisonEndDate: string | null;
	changesFilter: ChangesFilter;
	trendsFilter: TrendsFilter;
	trendsSelectedLenders: string[];
	changesSelectedLender: string;
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

export const $changesFilter = atom<ChangesFilter>(DEFAULT_CHANGES_FILTER);

export const $changesSelectedLender = atom<string>("all");

export const $trendsFilter = atom<TrendsFilter>(DEFAULT_TRENDS_FILTER);

export const $trendsDateRange = atom<{
	startDate: string | null;
	endDate: string | null;
}>({
	startDate: null,
	endDate: null,
});

export const $trendsSelectedLenders = atom<string[]>([]);

// Flag to track if this is a fresh session (no localStorage data existed)
// When true, the component should inject all lenders as default
export const $trendsLendersFirstVisit = atom<boolean>(true);

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
		changesFilter: $changesFilter.get(),
		trendsFilter: $trendsFilter.get(),
		trendsSelectedLenders: $trendsSelectedLenders.get(),
		changesSelectedLender: $changesSelectedLender.get(),
	};
	localStorage.setItem(HISTORY_FILTERS_KEY, JSON.stringify(state));
}

// Subscribe to all stores for auto-persistence
$historyActiveTab.listen(persistHistoryFilters);
$updatesFilter.listen(persistHistoryFilters);
$comparisonDate.listen(persistHistoryFilters);
$comparisonEndDate.listen(persistHistoryFilters);
$changesFilter.listen(persistHistoryFilters);
$trendsFilter.listen(persistHistoryFilters);
$trendsSelectedLenders.listen(persistHistoryFilters);
$changesSelectedLender.listen(persistHistoryFilters);

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
			$changesFilter.set(shareState.changesFilter);
			$trendsFilter.set(shareState.trendsFilter);
			$trendsSelectedLenders.set(shareState.trendsSelectedLenders);
			$trendsLendersFirstVisit.set(false); // Not first visit - data from share URL
			$changesSelectedLender.set(shareState.changesSelectedLender);

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
		if (stored.changesFilter) $changesFilter.set(stored.changesFilter);
		if (stored.trendsFilter) $trendsFilter.set(stored.trendsFilter);
		// Check if trendsSelectedLenders key exists in stored data (even if empty array)
		// This distinguishes "first visit" from "user explicitly cleared selection"
		if ("trendsSelectedLenders" in stored) {
			$trendsSelectedLenders.set(stored.trendsSelectedLenders ?? []);
			$trendsLendersFirstVisit.set(false); // Not first visit - localStorage had data
		}
		if (stored.changesSelectedLender)
			$changesSelectedLender.set(stored.changesSelectedLender);

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

export function setChangesFilter(filter: Partial<ChangesFilter>): void {
	$changesFilter.set({ ...$changesFilter.get(), ...filter });
}

export function resetChangesFilter(): void {
	$changesFilter.set(DEFAULT_CHANGES_FILTER);
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

export function setChangesSelectedLender(lenderId: string): void {
	$changesSelectedLender.set(lenderId);
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

export const $hasChangesFilter = computed($changesFilter, (filter) => {
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
	$trendsLendersFirstVisit.set(true);
}
