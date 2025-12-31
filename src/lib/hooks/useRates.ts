import { useEffect, useState } from "react";
import {
	type Lender,
	LendersFileSchema,
	type MortgageRate,
	type RatesFile,
	RatesFileSchema,
} from "@/lib/schemas";
import { getPath } from "@/lib/utils/path";

interface RatesMetadata {
	lenderId: string;
	lastScrapedAt: string;
	lastUpdatedAt: string;
}

interface UseRatesResult {
	rates: MortgageRate[];
	lenders: Lender[];
	ratesMetadata: RatesMetadata[];
	isLoading: boolean;
	error: Error | null;
}

// Cache to avoid refetching on every component mount
let cachedRates: MortgageRate[] | null = null;
let cachedLenders: Lender[] | null = null;
let cachedMetadata: RatesMetadata[] | null = null;
let fetchPromise: Promise<void> | null = null;

async function fetchLenderRates(
	lenderId: string,
): Promise<{ rates: MortgageRate[]; metadata: RatesMetadata | null }> {
	try {
		const res = await fetch(getPath(`data/rates/${lenderId}.json`));
		if (!res.ok) {
			// Silently skip lenders without rate data
			return { rates: [], metadata: null };
		}
		const json = await res.json();
		const ratesFile: RatesFile = RatesFileSchema.parse(json);
		return {
			rates: ratesFile.rates,
			metadata: {
				lenderId: ratesFile.lenderId,
				lastScrapedAt: ratesFile.lastScrapedAt,
				lastUpdatedAt: ratesFile.lastUpdatedAt,
			},
		};
	} catch {
		// Silently skip lenders with invalid/missing rate data
		return { rates: [], metadata: null };
	}
}

async function fetchData(): Promise<{
	rates: MortgageRate[];
	lenders: Lender[];
	metadata: RatesMetadata[];
}> {
	// First fetch lenders to know which rate files to load
	const lendersRes = await fetch(getPath("data/lenders.json"));
	if (!lendersRes.ok) {
		throw new Error("Failed to fetch lenders data");
	}

	const lendersJson = await lendersRes.json();
	const lenders = LendersFileSchema.parse(lendersJson);

	// Fetch rates for all lenders in parallel, silently skipping failures
	const results = await Promise.all(
		lenders.map((lender) => fetchLenderRates(lender.id)),
	);

	const rates = results.flatMap((r) => r.rates);
	const metadata = results
		.map((r) => r.metadata)
		.filter((m): m is RatesMetadata => m !== null);

	return { rates, lenders, metadata };
}

export function useRates(): UseRatesResult {
	const [rates, setRates] = useState<MortgageRate[]>(cachedRates ?? []);
	const [lenders, setLenders] = useState<Lender[]>(cachedLenders ?? []);
	const [ratesMetadata, setRatesMetadata] = useState<RatesMetadata[]>(
		cachedMetadata ?? [],
	);
	const [isLoading, setIsLoading] = useState(!cachedRates);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Already have cached data
		if (cachedRates && cachedLenders && cachedMetadata) {
			setRates(cachedRates);
			setLenders(cachedLenders);
			setRatesMetadata(cachedMetadata);
			setIsLoading(false);
			return;
		}

		// Fetch is already in progress, wait for it
		if (fetchPromise) {
			fetchPromise.then(() => {
				if (cachedRates && cachedLenders && cachedMetadata) {
					setRates(cachedRates);
					setLenders(cachedLenders);
					setRatesMetadata(cachedMetadata);
				}
				setIsLoading(false);
			});
			return;
		}

		// Start fetching
		fetchPromise = fetchData()
			.then(({ rates, lenders, metadata }) => {
				cachedRates = rates;
				cachedLenders = lenders;
				cachedMetadata = metadata;
				setRates(rates);
				setLenders(lenders);
				setRatesMetadata(metadata);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err instanceof Error ? err : new Error(String(err)));
				setIsLoading(false);
			});
	}, []);

	return { rates, lenders, ratesMetadata, isLoading, error };
}
