import { atom, computed } from "nanostores";
import { fetchAllRates, filterRates } from "@/lib/data/rates";
import type { BuyerType } from "@/lib/schemas/buyer";
import { DEFAULT_MAX_TERM } from "@/lib/schemas/lender";
import type {
	BerRating,
	MortgageRate,
	RatesMetadata,
} from "@/lib/schemas/rate";
import {
	$lenders,
	fetchLenders,
	isLendersFetched,
	markLendersFetched,
} from "../lenders";
import {
	fetchOverpaymentPolicies,
	isOverpaymentPoliciesFetched,
	markOverpaymentPoliciesFetched,
} from "../overpayment-policies";
import { fetchPerks, isPerksFetched, markPerksFetched } from "../perks";
import { $isFormValid } from "../validation";
// Import for use in computed values
import {
	$formValues,
	$isRemortgage,
	$ltv,
	$mortgage,
	$mortgageTerm,
} from "./rates-form";

// Atoms for rates data
export const $rates = atom<MortgageRate[]>([]);
export const $ratesMetadata = atom<RatesMetadata[]>([]);
export const $isLoading = atom<boolean>(true);
export const $error = atom<Error | null>(null);

// Track if rates have been fetched
let dataFetched = false;
let fetchPromise: Promise<void> | null = null;

// Filtered rates based on form values
export const $filteredRates = computed(
	[
		$isFormValid,
		$rates,
		$lenders,
		$ltv,
		$mortgage,
		$formValues,
		$isRemortgage,
		$mortgageTerm,
	],
	(
		isFormValid,
		rates,
		lenders,
		ltv,
		mortgage,
		values,
		isRemortgage,
		mortgageTerm,
	) => {
		if (!isFormValid || rates.length === 0) return [];

		const lenderMap = new Map(lenders.map((l) => [l.id, l]));

		return filterRates(rates, {
			ltv,
			mortgageAmount: mortgage,
			buyerType: values.buyerType as BuyerType,
			ber: values.berRating as BerRating,
			currentLender: isRemortgage
				? values.currentLender || undefined
				: undefined,
		})
			.filter((rate) => {
				const lender = lenderMap.get(rate.lenderId);
				const maxTermMonths = (lender?.maxTerm ?? DEFAULT_MAX_TERM) * 12;
				return mortgageTerm <= maxTermMonths;
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
			// Fetch lenders, perks, and overpayment policies if not already fetched
			await Promise.all([
				isLendersFetched() ? Promise.resolve() : fetchLenders(),
				isPerksFetched() ? Promise.resolve() : fetchPerks(),
				isOverpaymentPoliciesFetched()
					? Promise.resolve()
					: fetchOverpaymentPolicies(),
			]);

			const lenders = $lenders.get();
			markLendersFetched();
			markPerksFetched();
			markOverpaymentPoliciesFetched();

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
