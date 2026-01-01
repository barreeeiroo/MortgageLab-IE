import { useEffect, useMemo, useRef, useState } from "react";
import { type BerRating, type BuyerType, filterRates } from "@/lib/data";
import { useRates } from "@/lib/hooks";
import { DEFAULT_MAX_TERM } from "@/lib/schemas/lender";
import { loadRatesForm, saveRatesForm } from "@/lib/storage";
import { parseCurrency } from "@/lib/utils";
import { clearRatesShareParam, parseRatesShareState } from "./share";

// Storage keys for table state (must match RatesTable)
const TABLE_STORAGE_KEYS = {
	columns: "rates-table-columns",
	sorting: "rates-table-sorting",
	filters: "rates-table-filters",
} as const;

import {
	RatesInput,
	type RatesInputValues,
	type RatesMode,
} from "./RatesInput";
import { RatesTable } from "./RatesTable";
import { RatesTableSkeleton } from "./RatesTableSkeleton";

function getModeFromHash(): RatesMode | null {
	const hash = window.location.hash.slice(1);
	if (hash === "first-mortgage" || hash === "remortgage") {
		return hash;
	}
	return null;
}

export function RatesCalculator() {
	const { rates, lenders, ratesMetadata, isLoading, error } = useRates();

	const [values, setValues] = useState<RatesInputValues>({
		mode: "first-mortgage",
		propertyValue: "",
		mortgageAmount: "",
		monthlyRepayment: "",
		mortgageTerm: "30",
		berRating: "C1",
		buyerType: "ftb",
		currentLender: "",
	});

	const prevModeRef = useRef<RatesMode | null>(null);
	const isRemortgage = values.mode === "remortgage";

	// Map buyer type when switching modes
	useEffect(() => {
		const prevMode = prevModeRef.current;
		if (prevMode !== null && prevMode !== values.mode) {
			if (
				isRemortgage &&
				(values.buyerType === "ftb" || values.buyerType === "mover")
			) {
				setValues((v) => ({ ...v, buyerType: "mover" }));
			} else if (!isRemortgage && values.buyerType === "mover") {
				setValues((v) => ({ ...v, buyerType: "ftb" }));
			}
		}
		prevModeRef.current = values.mode;
	}, [values.mode, isRemortgage, values.buyerType]);

	// Load from URL params (priority) or localStorage on mount
	useEffect(() => {
		const sharedState = parseRatesShareState();

		if (sharedState) {
			// URL params take priority - load shared state
			setValues(sharedState.input);

			// Save table state to localStorage so RatesTable picks it up
			if (Object.keys(sharedState.table.columnVisibility).length > 0) {
				localStorage.setItem(
					TABLE_STORAGE_KEYS.columns,
					JSON.stringify(sharedState.table.columnVisibility),
				);
			}
			if (sharedState.table.columnFilters.length > 0) {
				localStorage.setItem(
					TABLE_STORAGE_KEYS.filters,
					JSON.stringify(sharedState.table.columnFilters),
				);
			}
			if (sharedState.table.sorting.length > 0) {
				localStorage.setItem(
					TABLE_STORAGE_KEYS.sorting,
					JSON.stringify(sharedState.table.sorting),
				);
			}

			// Clear URL params after loading
			clearRatesShareParam();
		} else {
			// Fall back to localStorage
			const saved = loadRatesForm();
			const hashMode = getModeFromHash();

			setValues((v) => ({
				...v,
				mode: hashMode ?? saved.mode ?? v.mode,
				propertyValue: saved.propertyValue ?? v.propertyValue,
				mortgageAmount: saved.mortgageAmount ?? v.mortgageAmount,
				monthlyRepayment: saved.monthlyRepayment ?? v.monthlyRepayment,
				mortgageTerm: saved.mortgageTerm ?? v.mortgageTerm,
				berRating: saved.berRating ?? v.berRating,
				buyerType: saved.buyerType ?? v.buyerType,
				currentLender: saved.currentLender ?? v.currentLender,
			}));
		}
	}, []);

	// Update URL hash when mode changes
	useEffect(() => {
		window.history.replaceState(null, "", `#${values.mode}`);
	}, [values.mode]);

	// Save to localStorage when form changes
	useEffect(() => {
		saveRatesForm({
			mode: values.mode,
			propertyValue: values.propertyValue,
			mortgageAmount: values.mortgageAmount,
			monthlyRepayment: values.monthlyRepayment,
			mortgageTerm: values.mortgageTerm,
			berRating: values.berRating,
			buyerType: values.buyerType,
			currentLender: values.currentLender,
		});
	}, [values]);

	// Computed values
	const property = parseCurrency(values.propertyValue);
	const mortgage = parseCurrency(values.mortgageAmount);
	const monthly = parseCurrency(values.monthlyRepayment);
	const deposit = property > 0 ? property - mortgage : 0;
	const ltv = property > 0 ? (mortgage / property) * 100 : 0;
	const mortgageTerm = Number.parseInt(values.mortgageTerm, 10) || 30;

	// Validation logic
	const isPrimaryResidence =
		values.buyerType === "ftb" || values.buyerType === "mover";
	const maxLtv = isPrimaryResidence ? 90 : 70;

	const isMortgageAboveProperty =
		mortgage > 0 && property > 0 && mortgage > property;
	const isLtvAboveMax = ltv > maxLtv;
	const isLtvAbove80Warning =
		isRemortgage && isPrimaryResidence && ltv > 80 && ltv <= 90;

	const hasError = isMortgageAboveProperty || isLtvAboveMax;
	const hasWarning = isLtvAbove80Warning;

	// Error messages
	let errorMessage: string | undefined;
	if (isMortgageAboveProperty) {
		errorMessage = `${isRemortgage ? "Outstanding balance" : "Mortgage amount"} cannot exceed property value.`;
	} else if (isLtvAboveMax) {
		errorMessage = `Maximum LTV for ${isPrimaryResidence ? "primary residence" : "this buyer type"} is ${maxLtv}%. ${isPrimaryResidence ? "Reduce mortgage amount or increase property value." : "Consider a larger deposit."}`;
	}

	const warningMessage = hasWarning
		? "LTV above 80% may limit lender options. Some lenders require lower LTV for mortgage switches."
		: undefined;

	// Form validity
	const isFormValid =
		property > 0 &&
		mortgage > 0 &&
		!hasError &&
		(!isRemortgage || (monthly > 0 && values.currentLender !== ""));

	// Filter rates based on inputs (LTV, buyer type, BER, term)
	const filteredRates = useMemo(() => {
		if (!isFormValid || rates.length === 0) return [];

		const lenderMap = new Map(lenders.map((l) => [l.id, l]));

		return filterRates(rates, {
			ltv,
			buyerType: values.buyerType as BuyerType,
			ber: values.berRating as BerRating,
			currentLender: isRemortgage
				? values.currentLender || undefined
				: undefined,
		})
			.filter((rate) => {
				const lender = lenderMap.get(rate.lenderId);
				const maxTerm = lender?.maxTerm ?? DEFAULT_MAX_TERM;
				return mortgageTerm <= maxTerm;
			})
			.sort((a, b) => a.rate - b.rate);
	}, [
		isFormValid,
		isRemortgage,
		rates,
		lenders,
		ltv,
		values.buyerType,
		values.berRating,
		values.currentLender,
		mortgageTerm,
	]);

	if (error) {
		return (
			<div className="text-center py-8 text-destructive">
				Failed to load rates. Please try refreshing the page.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<RatesInput
				values={values}
				onChange={setValues}
				lenders={lenders}
				deposit={deposit}
				ltv={ltv}
				isFormValid={isFormValid}
				hasError={hasError}
				hasWarning={hasWarning}
				errorMessage={errorMessage}
				warningMessage={warningMessage}
			/>

			{isLoading ? (
				<RatesTableSkeleton />
			) : (
				isFormValid && (
					<RatesTable
						rates={filteredRates}
						allRates={rates}
						lenders={lenders}
						ratesMetadata={ratesMetadata}
						mortgageAmount={mortgage}
						mortgageTerm={mortgageTerm}
						ltv={ltv}
						inputValues={values}
					/>
				)
			)}
		</div>
	);
}
