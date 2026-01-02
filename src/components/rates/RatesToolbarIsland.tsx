import { useStore } from "@nanostores/react";
import { useCallback, useEffect } from "react";
import {
	$columnFilters,
	$columnVisibility,
	$customLenders,
	$formValues,
	$isFormValid,
	$lenders,
	$perks,
	$ratesMetadata,
	$sorting,
	$storedCustomRates,
	addCustomRate,
	fetchRatesData,
	initializeCustomRates,
	initializeTableState,
	type StoredCustomRate,
	setColumnVisibility,
} from "@/lib/stores";
import { RatesToolbar } from "./RatesToolbar";

export function RatesToolbarIsland() {
	const isFormValid = useStore($isFormValid);
	const lenders = useStore($lenders);
	const customLenders = useStore($customLenders);
	const customRates = useStore($storedCustomRates);
	const perks = useStore($perks);
	const ratesMetadata = useStore($ratesMetadata);
	const inputValues = useStore($formValues);
	const columnVisibility = useStore($columnVisibility);
	const columnFilters = useStore($columnFilters);
	const sorting = useStore($sorting);

	// Initialize stores on mount
	useEffect(() => {
		initializeTableState();
		initializeCustomRates();
		// Ensure data is fetched (in case this island loads before others)
		fetchRatesData();
	}, []);

	const handleAddCustomRate = useCallback((rate: StoredCustomRate) => {
		addCustomRate(rate);
	}, []);

	return (
		<RatesToolbar
			lenders={lenders}
			customLenders={customLenders}
			customRates={customRates}
			perks={perks}
			ratesMetadata={ratesMetadata}
			inputValues={inputValues}
			columnVisibility={columnVisibility}
			columnFilters={columnFilters}
			sorting={sorting}
			onColumnVisibilityChange={setColumnVisibility}
			onAddCustomRate={handleAddCustomRate}
			disabled={!isFormValid}
		/>
	);
}
