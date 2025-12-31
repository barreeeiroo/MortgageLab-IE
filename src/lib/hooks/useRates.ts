import { useEffect, useState } from "react";
import {
	type Lender,
	LendersFileSchema,
	type MortgageRate,
	RatesFileSchema,
} from "@/lib/schemas";
import { getPath } from "@/lib/utils/path";

interface UseRatesResult {
	rates: MortgageRate[];
	lenders: Lender[];
	isLoading: boolean;
	error: Error | null;
}

// Cache to avoid refetching on every component mount
let cachedRates: MortgageRate[] | null = null;
let cachedLenders: Lender[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function fetchLenderRates(lenderId: string): Promise<MortgageRate[]> {
	try {
		const res = await fetch(getPath(`data/rates/${lenderId}.json`));
		if (!res.ok) {
			// Silently skip lenders without rate data
			return [];
		}
		const json = await res.json();
		return RatesFileSchema.parse(json);
	} catch {
		// Silently skip lenders with invalid/missing rate data
		return [];
	}
}

async function fetchData(): Promise<{
	rates: MortgageRate[];
	lenders: Lender[];
}> {
	// First fetch lenders to know which rate files to load
	const lendersRes = await fetch(getPath("data/lenders.json"));
	if (!lendersRes.ok) {
		throw new Error("Failed to fetch lenders data");
	}

	const lendersJson = await lendersRes.json();
	const lenders = LendersFileSchema.parse(lendersJson);

	// Fetch rates for all lenders in parallel, silently skipping failures
	const rateArrays = await Promise.all(
		lenders.map((lender) => fetchLenderRates(lender.id)),
	);

	const rates = rateArrays.flat();

	return { rates, lenders };
}

export function useRates(): UseRatesResult {
	const [rates, setRates] = useState<MortgageRate[]>(cachedRates ?? []);
	const [lenders, setLenders] = useState<Lender[]>(cachedLenders ?? []);
	const [isLoading, setIsLoading] = useState(!cachedRates);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Already have cached data
		if (cachedRates && cachedLenders) {
			setRates(cachedRates);
			setLenders(cachedLenders);
			setIsLoading(false);
			return;
		}

		// Fetch is already in progress, wait for it
		if (fetchPromise) {
			fetchPromise.then(() => {
				if (cachedRates && cachedLenders) {
					setRates(cachedRates);
					setLenders(cachedLenders);
				}
				setIsLoading(false);
			});
			return;
		}

		// Start fetching
		fetchPromise = fetchData()
			.then(({ rates, lenders }) => {
				cachedRates = rates;
				cachedLenders = lenders;
				setRates(rates);
				setLenders(lenders);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err instanceof Error ? err : new Error(String(err)));
				setIsLoading(false);
			});
	}, []);

	return { rates, lenders, isLoading, error };
}
