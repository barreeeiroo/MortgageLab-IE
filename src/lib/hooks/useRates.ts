import { useEffect, useState } from "react";
import {
	type Lender,
	LendersFileSchema,
	type MortgageRate,
	type Perk,
	PerksFileSchema,
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
	perks: Perk[];
	ratesMetadata: RatesMetadata[];
	isLoading: boolean;
	error: Error | null;
}

// Cache to avoid refetching on every component mount
let cachedRates: MortgageRate[] | null = null;
let cachedLenders: Lender[] | null = null;
let cachedPerks: Perk[] | null = null;
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
	perks: Perk[];
	metadata: RatesMetadata[];
}> {
	// Fetch lenders and perks in parallel
	const [lendersRes, perksRes] = await Promise.all([
		fetch(getPath("data/lenders.json")),
		fetch(getPath("data/perks.json")),
	]);

	if (!lendersRes.ok) {
		throw new Error("Failed to fetch lenders data");
	}
	if (!perksRes.ok) {
		throw new Error("Failed to fetch perks data");
	}

	const [lendersJson, perksJson] = await Promise.all([
		lendersRes.json(),
		perksRes.json(),
	]);

	const lenders = LendersFileSchema.parse(lendersJson);
	const perks = PerksFileSchema.parse(perksJson);

	// Fetch rates for all lenders in parallel, silently skipping failures
	const results = await Promise.all(
		lenders.map((lender) => fetchLenderRates(lender.id)),
	);

	const rates = results.flatMap((r) => r.rates);
	const metadata = results
		.map((r) => r.metadata)
		.filter((m): m is RatesMetadata => m !== null);

	return { rates, lenders, perks, metadata };
}

export function useRates(): UseRatesResult {
	const [rates, setRates] = useState<MortgageRate[]>(cachedRates ?? []);
	const [lenders, setLenders] = useState<Lender[]>(cachedLenders ?? []);
	const [perks, setPerks] = useState<Perk[]>(cachedPerks ?? []);
	const [ratesMetadata, setRatesMetadata] = useState<RatesMetadata[]>(
		cachedMetadata ?? [],
	);
	const [isLoading, setIsLoading] = useState(!cachedRates);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// Already have cached data
		if (cachedRates && cachedLenders && cachedPerks && cachedMetadata) {
			setRates(cachedRates);
			setLenders(cachedLenders);
			setPerks(cachedPerks);
			setRatesMetadata(cachedMetadata);
			setIsLoading(false);
			return;
		}

		// Fetch is already in progress, wait for it
		if (fetchPromise) {
			fetchPromise.then(() => {
				if (cachedRates && cachedLenders && cachedPerks && cachedMetadata) {
					setRates(cachedRates);
					setLenders(cachedLenders);
					setPerks(cachedPerks);
					setRatesMetadata(cachedMetadata);
				}
				setIsLoading(false);
			});
			return;
		}

		// Start fetching
		fetchPromise = fetchData()
			.then(({ rates, lenders, perks, metadata }) => {
				cachedRates = rates;
				cachedLenders = lenders;
				cachedPerks = perks;
				cachedMetadata = metadata;
				setRates(rates);
				setLenders(lenders);
				setPerks(perks);
				setRatesMetadata(metadata);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err instanceof Error ? err : new Error(String(err)));
				setIsLoading(false);
			});
	}, []);

	return { rates, lenders, perks, ratesMetadata, isLoading, error };
}
