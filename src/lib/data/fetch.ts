/**
 * Data fetching utilities for lenders, perks, and rates.
 * All fetch functions use getPath to handle base path correctly.
 */

import { type Lender, LendersFileSchema } from "@/lib/schemas/lender";
import {
	OverpaymentPoliciesFileSchema,
	type OverpaymentPolicy,
} from "@/lib/schemas/overpayment-policy";
import { type Perk, PerksFileSchema } from "@/lib/schemas/perk";
import {
	type MortgageRate,
	type RatesFile,
	RatesFileSchema,
	type RatesMetadata,
} from "@/lib/schemas/rate";
import {
	type SelfBuildTemplate,
	SelfBuildTemplatesFileSchema,
} from "@/lib/schemas/self-build-template";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch lenders data from the JSON file.
 * @returns Array of lenders, or empty array on error
 */
export async function fetchLendersData(): Promise<Lender[]> {
	try {
		const res = await fetch(getPath("data/lenders.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return LendersFileSchema.parse(json);
	} catch {
		return [];
	}
}

/**
 * Fetch perks data from the JSON file.
 * @returns Array of perks, or empty array on error
 */
export async function fetchPerksData(): Promise<Perk[]> {
	try {
		const res = await fetch(getPath("data/perks.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return PerksFileSchema.parse(json);
	} catch {
		return [];
	}
}

/**
 * Fetch overpayment policies data from the JSON file.
 * @returns Array of overpayment policies, or empty array on error
 */
export async function fetchOverpaymentPoliciesData(): Promise<
	OverpaymentPolicy[]
> {
	try {
		const res = await fetch(getPath("data/overpayment-policies.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return OverpaymentPoliciesFileSchema.parse(json);
	} catch {
		return [];
	}
}

/**
 * Fetch rates data for a specific lender.
 * @param lenderId - The lender ID to fetch rates for
 * @returns Object containing rates array and metadata, or empty rates on error
 */
export async function fetchLenderRates(
	lenderId: string,
): Promise<{ rates: MortgageRate[]; metadata: RatesMetadata | null }> {
	try {
		const res = await fetch(getPath(`data/rates/${lenderId}.json`));
		if (!res.ok) {
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
		return { rates: [], metadata: null };
	}
}

/**
 * Fetch all rates data for all lenders.
 * @param lenders - Array of lenders to fetch rates for
 * @returns Object containing all rates and metadata arrays
 */
export async function fetchAllRates(lenders: Lender[]): Promise<{
	rates: MortgageRate[];
	metadata: RatesMetadata[];
}> {
	const results = await Promise.all(
		lenders.map((lender) => fetchLenderRates(lender.id)),
	);

	return {
		rates: results.flatMap((r) => r.rates),
		metadata: results
			.map((r) => r.metadata)
			.filter((m): m is RatesMetadata => m !== null),
	};
}

/**
 * Fetch self-build templates data from the JSON file.
 * @returns Array of self-build templates, or empty array on error
 */
export async function fetchSelfBuildTemplatesData(): Promise<
	SelfBuildTemplate[]
> {
	try {
		const res = await fetch(getPath("data/self-build-templates.json"));
		if (!res.ok) return [];
		const json = await res.json();
		return SelfBuildTemplatesFileSchema.parse(json);
	} catch {
		return [];
	}
}
