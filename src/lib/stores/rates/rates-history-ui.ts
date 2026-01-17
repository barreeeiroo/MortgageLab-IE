import { atom, computed } from "nanostores";

// === History Page UI State ===

export type HistoryTab = "updates" | "compare" | "trends";

// Active tab on history page
export const $historyActiveTab = atom<HistoryTab>("updates");

// === Updates Timeline Filters ===

export interface UpdatesFilter {
	lenderIds: string[]; // Empty = all lenders
	startDate: string | null; // ISO date string
	endDate: string | null;
	changeType: "all" | "increase" | "decrease" | "added" | "removed";
}

export const DEFAULT_UPDATES_FILTER: UpdatesFilter = {
	lenderIds: [],
	startDate: null,
	endDate: null,
	changeType: "all",
};

export const $updatesFilter = atom<UpdatesFilter>(DEFAULT_UPDATES_FILTER);

// === Historical Comparison State ===

export const $comparisonDate = atom<string | null>(null); // ISO date string

export interface CompareFilter {
	lenderIds: string[]; // Empty = all lenders
	rateType: "all" | "fixed" | "variable";
	ltvRange: [number, number] | null; // e.g., [0, 80]
}

export const DEFAULT_COMPARE_FILTER: CompareFilter = {
	lenderIds: [],
	rateType: "all",
	ltvRange: null,
};

export const $compareFilter = atom<CompareFilter>(DEFAULT_COMPARE_FILTER);

// === Trend Charts State ===

export interface TrendsFilter {
	rateType: string | null; // e.g., "fixed-3" for 3-year fixed
	fixedTerm: number | null; // e.g., 3 for 3-year fixed
	ltvRange: [number, number] | null;
	lenderIds: string[]; // Empty = all lenders
}

export const DEFAULT_TRENDS_FILTER: TrendsFilter = {
	rateType: null,
	fixedTerm: null,
	ltvRange: null,
	lenderIds: [],
};

export const $trendsFilter = atom<TrendsFilter>(DEFAULT_TRENDS_FILTER);

// Date range for trend chart zoom
export const $trendsDateRange = atom<{
	startDate: string | null;
	endDate: string | null;
}>({
	startDate: null,
	endDate: null,
});

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

// === Computed Values ===

// Check if any updates filter is active
export const $hasUpdatesFilter = computed($updatesFilter, (filter) => {
	return (
		filter.lenderIds.length > 0 ||
		filter.startDate !== null ||
		filter.endDate !== null ||
		filter.changeType !== "all"
	);
});

// Check if any compare filter is active
export const $hasCompareFilter = computed($compareFilter, (filter) => {
	return (
		filter.lenderIds.length > 0 ||
		filter.rateType !== "all" ||
		filter.ltvRange !== null
	);
});

// Check if any trends filter is active
export const $hasTrendsFilter = computed($trendsFilter, (filter) => {
	return (
		filter.rateType !== null ||
		filter.fixedTerm !== null ||
		filter.ltvRange !== null ||
		filter.lenderIds.length > 0
	);
});
