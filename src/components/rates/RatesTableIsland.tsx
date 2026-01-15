import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { $allPerks, initializeCustomPerks } from "@/lib/stores/custom-perks";
import {
	$customRates,
	$filteredCustomRates,
	initializeCustomRates,
} from "@/lib/stores/custom-rates";
import { $lenders } from "@/lib/stores/lenders";
import { $overpaymentPolicies } from "@/lib/stores/overpayment-policies";
import { initializeStore } from "@/lib/stores/persistence";
import {
	$formValues,
	$ltv,
	$mortgage,
	$mortgageTerm,
} from "@/lib/stores/rates/rates-form";
import {
	$error,
	$filteredRates,
	$isLoading,
	$rates,
	fetchRatesData,
} from "@/lib/stores/rates/rates-state";
import {
	$columnFilters,
	$columnVisibility,
	$compactMode,
	$pageIndex,
	$pageSize,
	$sorting,
	initializeTableState,
	setColumnFilters,
	setColumnVisibility,
	setPageIndex,
	setPageSize,
	setSorting,
} from "@/lib/stores/rates/rates-table";
import { $isFormValid } from "@/lib/stores/validation";
import { RatesTable } from "./RatesTable";
import { RatesTableSkeleton } from "./RatesTableSkeleton";

export function RatesTableIsland() {
	const isLoading = useStore($isLoading);
	const error = useStore($error);
	const isFormValid = useStore($isFormValid);
	const filteredRates = useStore($filteredRates);
	const allRates = useStore($rates);
	const customRates = useStore($customRates);
	const filteredCustomRates = useStore($filteredCustomRates);
	const lenders = useStore($lenders);
	const allPerks = useStore($allPerks);
	const overpaymentPolicies = useStore($overpaymentPolicies);
	const mortgage = useStore($mortgage);
	const mortgageTerm = useStore($mortgageTerm); // in months
	const ltv = useStore($ltv);
	const inputValues = useStore($formValues);

	// Table state from store
	const sorting = useStore($sorting);
	const columnFilters = useStore($columnFilters);
	const columnVisibility = useStore($columnVisibility);
	const compactMode = useStore($compactMode);
	const pageSize = useStore($pageSize);
	const pageIndex = useStore($pageIndex);

	// Initialize stores on mount
	useEffect(() => {
		const importResult = initializeStore();
		if (importResult) {
			const { imported, skipped } = importResult;
			if (imported > 0 && skipped > 0) {
				toast.success(
					`Imported ${imported} custom rate${imported !== 1 ? "s" : ""}, ${skipped} skipped (already exist${skipped === 1 ? "s" : ""})`,
				);
			} else if (imported > 0) {
				toast.success(
					`Imported ${imported} custom rate${imported !== 1 ? "s" : ""}`,
				);
			} else if (skipped > 0) {
				toast.info(
					`${skipped} custom rate${skipped !== 1 ? "s" : ""} skipped (already exist${skipped === 1 ? "s" : ""})`,
				);
			}
		}
		initializeTableState();
		initializeCustomRates();
		initializeCustomPerks();
		fetchRatesData();
	}, []);

	// Pagination change handler
	const handlePaginationChange = useCallback(
		(newPagination: { pageIndex: number; pageSize: number }) => {
			setPageIndex(newPagination.pageIndex);
			if (newPagination.pageSize !== pageSize) {
				setPageSize(newPagination.pageSize);
			}
		},
		[pageSize],
	);

	// Column filters change handler (resets page index)
	const handleColumnFiltersChange = useCallback(
		(filters: typeof columnFilters) => {
			setColumnFilters(filters);
		},
		[],
	);

	if (error) {
		return (
			<div className="mt-4 text-center py-8 text-destructive">
				Failed to load rates. Please try refreshing the page.
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="mt-4">
				<RatesTableSkeleton />
			</div>
		);
	}

	if (!isFormValid) {
		return null;
	}

	// Combine regular rates with filtered custom rates
	const allDisplayRates = [...filteredRates, ...filteredCustomRates];

	// Combine allRates with all custom rates for follow-on rate matching
	const allRatesWithCustom = [...allRates, ...customRates];

	return (
		<div className="mt-4">
			<RatesTable
				rates={allDisplayRates}
				allRates={allRatesWithCustom}
				lenders={lenders}
				perks={allPerks}
				overpaymentPolicies={overpaymentPolicies}
				mortgageAmount={mortgage}
				mortgageTerm={mortgageTerm}
				ltv={ltv}
				inputValues={inputValues}
				// Table state from store
				sorting={sorting}
				onSortingChange={setSorting}
				columnFilters={columnFilters}
				onColumnFiltersChange={handleColumnFiltersChange}
				columnVisibility={columnVisibility}
				onColumnVisibilityChange={setColumnVisibility}
				compactMode={compactMode}
				pagination={{ pageIndex, pageSize }}
				onPaginationChange={handlePaginationChange}
			/>
		</div>
	);
}
