import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
	$columnFilters,
	$columnVisibility,
	$formValues,
	$isLoading,
	$lenders,
	$ratesMetadata,
	$sorting,
	fetchRatesData,
	initializeStore,
	initializeTableState,
	setColumnVisibility,
} from "@/lib/stores";
import { RatesToolbar } from "./RatesToolbar";

export function RatesToolbarIsland() {
	const isLoading = useStore($isLoading);
	const lenders = useStore($lenders);
	const ratesMetadata = useStore($ratesMetadata);
	const inputValues = useStore($formValues);
	const columnVisibility = useStore($columnVisibility);
	const columnFilters = useStore($columnFilters);
	const sorting = useStore($sorting);

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
			onColumnVisibilityChange={setColumnVisibility}
			disabled={isLoading}
		/>
	);
}
