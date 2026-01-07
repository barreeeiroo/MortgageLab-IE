import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
	$columnFilters,
	$columnVisibility,
	$compactMode,
	$formValues,
	$isFormValid,
	$isLoading,
	$lenders,
	$ratesMetadata,
	$sorting,
	fetchRatesData,
	initializeStore,
	initializeTableState,
	setColumnVisibility,
	setCompactMode,
} from "@/lib/stores";
import { RatesToolbar } from "./RatesToolbar";

export function RatesToolbarIsland() {
	const isLoading = useStore($isLoading);
	const isFormValid = useStore($isFormValid);
	const lenders = useStore($lenders);
	const ratesMetadata = useStore($ratesMetadata);
	const inputValues = useStore($formValues);
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
			ratesMetadata={ratesMetadata}
			inputValues={inputValues}
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
