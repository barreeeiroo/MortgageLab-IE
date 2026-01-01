import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import {
	$error,
	$filteredRates,
	$formValues,
	$isFormValid,
	$isLoading,
	$lenders,
	$ltv,
	$mortgage,
	$mortgageTerm,
	$perks,
	$rates,
	$ratesMetadata,
	fetchRatesData,
} from "@/lib/stores/rates";
import { RatesTable } from "./RatesTable";
import { RatesTableSkeleton } from "./RatesTableSkeleton";

export function RatesTableIsland() {
	const isLoading = useStore($isLoading);
	const error = useStore($error);
	const isFormValid = useStore($isFormValid);
	const filteredRates = useStore($filteredRates);
	const allRates = useStore($rates);
	const lenders = useStore($lenders);
	const perks = useStore($perks);
	const ratesMetadata = useStore($ratesMetadata);
	const mortgage = useStore($mortgage);
	const mortgageTerm = useStore($mortgageTerm);
	const ltv = useStore($ltv);
	const inputValues = useStore($formValues);

	// Ensure data is fetched (in case this island loads before RatesInputIsland)
	useEffect(() => {
		fetchRatesData();
	}, []);

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

	return (
		<div className="mt-4">
			<RatesTable
				rates={filteredRates}
				allRates={allRates}
				lenders={lenders}
				perks={perks}
				ratesMetadata={ratesMetadata}
				mortgageAmount={mortgage}
				mortgageTerm={mortgageTerm}
				ltv={ltv}
				inputValues={inputValues}
			/>
		</div>
	);
}
