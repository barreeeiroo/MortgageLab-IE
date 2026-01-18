import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import { $lenders } from "@/lib/stores/lenders";
import { initializeStore } from "@/lib/stores/persistence";
import {
	$formValues,
	$ltv,
	$mortgage,
	$mortgageTerm,
} from "@/lib/stores/rates/rates-form";
import {
	$filteredRates,
	$isLoading,
	$rates,
	fetchRatesData,
} from "@/lib/stores/rates/rates-state";
import {
	$columnFilters,
	$columnVisibility,
	$compactMode,
	$sorting,
	initializeTableState,
	setColumnVisibility,
	setCompactMode,
} from "@/lib/stores/rates/rates-table";
import { $isFormValid } from "@/lib/stores/validation";
import { RatesToolbar } from "./RatesToolbar";

export function RatesToolbarIsland() {
	const isLoading = useStore($isLoading);
	const isFormValid = useStore($isFormValid);
	const lenders = useStore($lenders);
	const inputValues = useStore($formValues);
	const filteredRates = useStore($filteredRates);
	const allRates = useStore($rates);
	const mortgageAmount = useStore($mortgage);
	const mortgageTerm = useStore($mortgageTerm);
	const ltv = useStore($ltv);
	const columnVisibility = useStore($columnVisibility);
	const columnFilters = useStore($columnFilters);
	const sorting = useStore($sorting);
	const compactMode = useStore($compactMode);

	// Initialize stores on mount
	useEffect(() => {
		initializeStore();
		initializeTableState();
		// Ensure data is fetched (in case this island loads before others)
		fetchRatesData();
	}, []);

	return (
		<RatesToolbar
			lenders={lenders}
			inputValues={inputValues}
			filteredRates={filteredRates}
			allRates={allRates}
			mortgageAmount={mortgageAmount}
			mortgageTerm={mortgageTerm}
			ltv={ltv}
			columnVisibility={columnVisibility}
			columnFilters={columnFilters}
			sorting={sorting}
			compactMode={compactMode}
			onColumnVisibilityChange={setColumnVisibility}
			onCompactModeChange={setCompactMode}
			disabled={isLoading || !isFormValid}
		/>
	);
}
