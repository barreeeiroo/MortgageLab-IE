import { createHash } from "node:crypto";
import type { MortgageRate } from "../../src/lib/schemas/rate";

/**
 * Normalizes a rate object to ensure consistent hashing.
 * - Explicit key order
 * - Optional fields coalesced to null
 * - Arrays sorted alphabetically
 */
function normalizeRate(rate: MortgageRate): object {
	return {
		id: rate.id,
		name: rate.name,
		lenderId: rate.lenderId,
		type: rate.type,
		rate: rate.rate,
		apr: rate.apr ?? null,
		fixedTerm: rate.fixedTerm ?? null,
		minLtv: rate.minLtv,
		maxLtv: rate.maxLtv,
		minLoan: rate.minLoan ?? null,
		buyerTypes: [...rate.buyerTypes].sort(),
		berEligible: rate.berEligible ? [...rate.berEligible].sort() : null,
		newBusiness: rate.newBusiness ?? null,
		perks: [...rate.perks].sort(),
	};
}

/**
 * Computes a hash of the rates array for change detection.
 * Rates are normalized and sorted by ID before hashing.
 */
export function computeRatesHash(rates: MortgageRate[]): string {
	const normalized = rates
		.map((rate) => normalizeRate(rate))
		.sort((a, b) =>
			(a as { id: string }).id.localeCompare((b as { id: string }).id),
		)
		.map((rate) => JSON.stringify(rate))
		.join("\n");

	return createHash("sha256").update(normalized).digest("hex");
}
