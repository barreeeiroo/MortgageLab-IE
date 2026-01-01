import { useStore } from "@nanostores/react";
import { useEffect, useRef } from "react";
import {
	$deposit,
	$errorMessage,
	$formValues,
	$hasError,
	$hasWarning,
	$isFormValid,
	$lenders,
	$ltv,
	$warningMessage,
	fetchLenders,
	handleModeSwitch,
	initializeStore,
	persistFormValues,
	type RatesInputValues,
	setFormValues,
} from "@/lib/stores/rates";
import { RatesInput } from "./RatesInput";

export function RatesInputIsland() {
	const values = useStore($formValues);
	const lenders = useStore($lenders);
	const deposit = useStore($deposit);
	const ltv = useStore($ltv);
	const isFormValid = useStore($isFormValid);
	const hasError = useStore($hasError);
	const hasWarning = useStore($hasWarning);
	const errorMessage = useStore($errorMessage);
	const warningMessage = useStore($warningMessage);

	const prevModeRef = useRef(values.mode);

	// Initialize store and fetch lenders on mount
	useEffect(() => {
		initializeStore();
		fetchLenders();
	}, []);

	// Handle mode switching (buyer type mapping)
	useEffect(() => {
		if (prevModeRef.current !== values.mode) {
			handleModeSwitch(prevModeRef.current, values.mode);
			prevModeRef.current = values.mode;
		}
	}, [values.mode]);

	// Update URL hash when mode changes
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.history.replaceState(null, "", `#${values.mode}`);
		}
	}, [values.mode]);

	// Persist form values when they change
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional - persist whenever any form value changes
	useEffect(() => {
		persistFormValues();
	}, [
		values.mode,
		values.propertyValue,
		values.mortgageAmount,
		values.monthlyRepayment,
		values.mortgageTerm,
		values.berRating,
		values.buyerType,
		values.currentLender,
	]);

	const handleChange = (newValues: RatesInputValues) => {
		setFormValues(newValues);
	};

	return (
		<div className="space-y-4">
			<RatesInput
				values={values}
				onChange={handleChange}
				lenders={lenders}
				deposit={deposit}
				ltv={ltv}
				isFormValid={isFormValid}
				hasError={hasError}
				hasWarning={hasWarning}
				errorMessage={errorMessage}
				warningMessage={warningMessage}
			/>
		</div>
	);
}
