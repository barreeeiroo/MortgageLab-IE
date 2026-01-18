/**
 * Data fetching utilities for historical rate data.
 * All fetch functions use getPath to handle base path correctly.
 * Functions return null or skip missing files gracefully - never throw on 404.
 */

import type { Lender } from "@/lib/schemas/lender";
import {
	type RatesHistoryFile,
	RatesHistoryFileSchema,
} from "@/lib/schemas/rate-history";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch history data for a specific lender.
 * @param lenderId - The lender ID to fetch history for
 * @returns History file or null if not found
 */
export async function fetchLenderHistory(
	lenderId: string,
): Promise<RatesHistoryFile | null> {
	try {
		const res = await fetch(getPath(`data/rates/history/${lenderId}.json`));
		if (!res.ok) return null;
		const json = await res.json();
		return RatesHistoryFileSchema.parse(json);
	} catch {
		return null;
	}
}

/**
 * Fetch history for multiple lenders in parallel.
 * Skips missing files - only returns successful fetches.
 * @param lenderIds - Array of lender IDs to fetch
 * @returns Map of lenderId to history file
 */
export async function fetchMultipleLenderHistory(
	lenderIds: string[],
): Promise<Map<string, RatesHistoryFile>> {
	const results = await Promise.all(
		lenderIds.map(async (id) => {
			const history = await fetchLenderHistory(id);
			return [id, history] as const;
		}),
	);

	const map = new Map<string, RatesHistoryFile>();
	for (const [id, history] of results) {
		if (history) {
			map.set(id, history);
		}
	}
	return map;
}

/**
 * Fetch history for all lenders from lenders.json.
 * Skips discontinued lenders unless includeDiscontinued is true.
 * @param lenders - Array of lenders to fetch history for
 * @param includeDiscontinued - Include discontinued lenders (default: false)
 * @returns Map of lenderId to history file
 */
export async function fetchAllHistory(
	lenders: Lender[],
	includeDiscontinued = false,
): Promise<Map<string, RatesHistoryFile>> {
	const filteredLenders = includeDiscontinued
		? lenders
		: lenders.filter((l) => !l.discontinued);

	return fetchMultipleLenderHistory(filteredLenders.map((l) => l.id));
}
