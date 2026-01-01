import { atom, computed } from "nanostores";
import {
	type BerRating,
	type BuyerType,
	filterRates,
	type MortgageRate,
} from "@/lib/data";
import { fetchAllRates } from "@/lib/data/fetch";
import type { RatesMetadata } from "@/lib/schemas";
import { DEFAULT_MAX_TERM } from "@/lib/schemas/lender";
import {
	$lenders,
	fetchLenders,
	isLendersFetched,
	markLendersFetched,
} from "./lenders";
import { fetchPerks, isPerksFetched, markPerksFetched } from "./perks";

// Re-export from form store
export {
	$deposit,
	$formValues,
	$isPrimaryResidence,
	$isRemortgage,
	$ltv,
	$maxLtv,
	$monthly,
	$mortgage,
	$mortgageTerm,
	$property,
	DEFAULT_VALUES,
	handleModeSwitch,
	type RatesInputValues,
	type RatesMode,
	setFormValues,
	updateFormValue,
} from "./form";
// Re-export from lenders and perks stores
export { $lenders, fetchLenders } from "./lenders";
export { $perks, fetchPerks } from "./perks";
// Re-export from persistence store
export {
	initializeStore,
	persistFormValues,
	TABLE_STORAGE_KEYS,
	updateUrlHash,
} from "./persistence";
// Re-export from validation store
export {
	$errorMessage,
	$hasError,
	$hasWarning,
	$isFormValid,
	$isLtvAbove80Warning,
	$isLtvAboveMax,
	$isMortgageAboveProperty,
	$warningMessage,
} from "./validation";

// Import for use in computed values
import { $formValues, $isRemortgage, $mortgageTerm } from "./form";
import { $isFormValid } from "./validation";

// Atoms for rates data
export const $rates = atom<MortgageRate[]>([]);
export const $ratesMetadata = atom<RatesMetadata[]>([]);
export const $isLoading = atom<boolean>(true);
export const $error = atom<Error | null>(null);

// Track if rates have been fetched
let dataFetched = false;
let fetchPromise: Promise<void> | null = null;

// Computed: LTV for filtering (imported from form)
import { $ltv } from "./form";

// Filtered rates based on form values
export const $filteredRates = computed(
	[
		$isFormValid,
		$rates,
		$lenders,
		$ltv,
		$formValues,
		$isRemortgage,
		$mortgageTerm,
	],
	(isFormValid, rates, lenders, ltv, values, isRemortgage, mortgageTerm) => {
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
	},
);

// Fetch all rates data
export async function fetchRatesData(): Promise<void> {
	if (dataFetched) return;
	if (fetchPromise) {
		await fetchPromise;
		return;
	}

	$isLoading.set(true);

	fetchPromise = (async () => {
		try {
			// Fetch lenders and perks if not already fetched
			await Promise.all([
				isLendersFetched() ? Promise.resolve() : fetchLenders(),
				isPerksFetched() ? Promise.resolve() : fetchPerks(),
			]);

			const lenders = $lenders.get();
			markLendersFetched();
			markPerksFetched();

			// Fetch rates for all lenders
			const { rates, metadata } = await fetchAllRates(lenders);

			$rates.set(rates);
			$ratesMetadata.set(metadata);
			dataFetched = true;
		} catch (err) {
			$error.set(err instanceof Error ? err : new Error(String(err)));
		} finally {
			$isLoading.set(false);
		}
	})();

	await fetchPromise;
}
