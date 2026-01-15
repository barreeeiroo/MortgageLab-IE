import type {
	ColumnFiltersState,
	SortingState,
	VisibilityState,
} from "@tanstack/react-table";
import { atom } from "nanostores";

// Storage keys for table state
export const TABLE_STORAGE_KEYS = {
	columns: "rates-table-columns",
	sorting: "rates-table-sorting",
	filters: "rates-table-filters",
	pageSize: "rates-table-page-size",
	compactMode: "rates-table-compact",
} as const;

// Column labels for the visibility toggle
export const COLUMN_LABELS: Record<string, string> = {
	lenderId: "Lender",
	name: "Product",
	perks: "Perks",
	type: "Type",
	fixedTerm: "Period",
	rate: "Rate",
	apr: "APRC",
	monthlyPayment: "Monthly",
	followOnProduct: "Follow-On Product",
	monthlyFollowOn: "Follow-On Monthly",
	totalRepayable: "Total Repayable",
	costOfCreditPct: "Cost of Credit %",
};

// Columns that can be toggled (excludes lenderId, name, and actions)
export const HIDEABLE_COLUMNS = [
	"perks",
	"type",
	"fixedTerm",
	"rate",
	"apr",
	"monthlyPayment",
	"followOnProduct",
	"monthlyFollowOn",
	"totalRepayable",
	"costOfCreditPct",
] as const;

// Default values
export const DEFAULT_COLUMN_VISIBILITY: VisibilityState = {
	perks: false,
	followOnProduct: false,
	monthlyFollowOn: false,
	costOfCreditPct: false,
};

export const DEFAULT_SORTING: SortingState = [
	{ id: "monthlyPayment", desc: false },
];

export const DEFAULT_FILTERS: ColumnFiltersState = [];

export const DEFAULT_PAGE_SIZE = 10;

// Atoms for rates table state
export const $columnVisibility = atom<VisibilityState>(
	DEFAULT_COLUMN_VISIBILITY,
);
export const $sorting = atom<SortingState>(DEFAULT_SORTING);
export const $columnFilters = atom<ColumnFiltersState>(DEFAULT_FILTERS);
export const $pageSize = atom<number>(DEFAULT_PAGE_SIZE);
export const $pageIndex = atom<number>(0);
export const $compactMode = atom<boolean>(false);

// Track if table state has been initialized from localStorage
let tableStateInitialized = false;

// Initialize table state from localStorage
export function initializeTableState(): void {
	if (typeof window === "undefined" || tableStateInitialized) return;
	tableStateInitialized = true;

	try {
		const storedVisibility = localStorage.getItem(TABLE_STORAGE_KEYS.columns);
		if (storedVisibility) {
			$columnVisibility.set(JSON.parse(storedVisibility));
		}

		const storedSorting = localStorage.getItem(TABLE_STORAGE_KEYS.sorting);
		if (storedSorting) {
			$sorting.set(JSON.parse(storedSorting));
		}

		const storedFilters = localStorage.getItem(TABLE_STORAGE_KEYS.filters);
		if (storedFilters) {
			$columnFilters.set(JSON.parse(storedFilters));
		}

		const storedPageSize = localStorage.getItem(TABLE_STORAGE_KEYS.pageSize);
		if (storedPageSize) {
			$pageSize.set(JSON.parse(storedPageSize));
		}

		const storedCompactMode = localStorage.getItem(
			TABLE_STORAGE_KEYS.compactMode,
		);
		if (storedCompactMode) {
			$compactMode.set(JSON.parse(storedCompactMode));
		}
	} catch {
		// Ignore parse errors, use defaults
	}
}

// Actions with persistence
export function setColumnVisibility(visibility: VisibilityState): void {
	$columnVisibility.set(visibility);
	if (typeof window !== "undefined") {
		localStorage.setItem(
			TABLE_STORAGE_KEYS.columns,
			JSON.stringify(visibility),
		);
	}
}

export function toggleColumnVisibility(columnId: string): void {
	const current = $columnVisibility.get();
	const newVisibility = {
		...current,
		[columnId]: current[columnId] === false,
	};
	setColumnVisibility(newVisibility);
}

export function setSorting(sorting: SortingState): void {
	$sorting.set(sorting);
	if (typeof window !== "undefined") {
		localStorage.setItem(TABLE_STORAGE_KEYS.sorting, JSON.stringify(sorting));
	}
}

export function setColumnFilters(filters: ColumnFiltersState): void {
	$columnFilters.set(filters);
	$pageIndex.set(0); // Reset to first page on filter change
	if (typeof window !== "undefined") {
		localStorage.setItem(TABLE_STORAGE_KEYS.filters, JSON.stringify(filters));
	}
}

export function setPageSize(size: number): void {
	$pageSize.set(size);
	if (typeof window !== "undefined") {
		localStorage.setItem(TABLE_STORAGE_KEYS.pageSize, JSON.stringify(size));
	}
}

export function setPageIndex(index: number): void {
	$pageIndex.set(index);
}

export function setCompactMode(compact: boolean): void {
	$compactMode.set(compact);
	if (typeof window !== "undefined") {
		localStorage.setItem(
			TABLE_STORAGE_KEYS.compactMode,
			JSON.stringify(compact),
		);
	}
}

export function toggleCompactMode(): void {
	setCompactMode(!$compactMode.get());
}
