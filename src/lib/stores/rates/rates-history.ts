import { atom } from "nanostores";
import { fetchLenderHistory } from "@/lib/data/fetch-history";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
	RateChange,
	RatesHistoryFile,
	RateTimeSeries,
} from "@/lib/schemas/rate-history";

// Atoms for history data (loaded on-demand per lender)
export const $historyByLender = atom<Map<string, RatesHistoryFile>>(new Map());
export const $historyLoading = atom<boolean>(false);
export const $historyError = atom<Error | null>(null);

// Track fetch promises to deduplicate concurrent requests
const historyFetchPromises = new Map<string, Promise<void>>();

/**
 * Fetch history for a specific lender (on-demand).
 * Returns cached data if already loaded.
 */
export async function fetchLenderHistoryData(
	lenderId: string,
): Promise<RatesHistoryFile | null> {
	const existing = $historyByLender.get().get(lenderId);
	if (existing) return existing;

	// Deduplicate concurrent requests
	const existingPromise = historyFetchPromises.get(lenderId);
	if (existingPromise) {
		await existingPromise;
		return $historyByLender.get().get(lenderId) ?? null;
	}

	const fetchPromise = (async () => {
		$historyLoading.set(true);
		try {
			const history = await fetchLenderHistory(lenderId);
			if (history) {
				const newMap = new Map($historyByLender.get());
				newMap.set(lenderId, history);
				$historyByLender.set(newMap);
			}
		} catch (err) {
			$historyError.set(err instanceof Error ? err : new Error(String(err)));
		} finally {
			$historyLoading.set(false);
			historyFetchPromises.delete(lenderId);
		}
	})();

	historyFetchPromises.set(lenderId, fetchPromise);
	await fetchPromise;
	return $historyByLender.get().get(lenderId) ?? null;
}

// === Pure Query Functions ===

/**
 * Reconstructs the full rate array at a specific point in time.
 * Starts from baseline, applies changesets up to target date.
 */
export function reconstructRatesAtDate(
	history: RatesHistoryFile,
	targetDate: Date,
): MortgageRate[] {
	const targetTs = targetDate.getTime();
	const baselineTs = new Date(history.baseline.timestamp).getTime();

	// If target is before baseline, return empty
	if (targetTs < baselineTs) {
		return [];
	}

	// Start with baseline
	const rateMap = new Map<string, MortgageRate>(
		history.baseline.rates.map((r) => [r.id, { ...r }]),
	);

	// Apply changesets up to and including target date
	for (const changeset of history.changesets) {
		const changesetTs = new Date(changeset.timestamp).getTime();
		if (changesetTs > targetTs) {
			break; // Past target date
		}

		for (const op of changeset.operations) {
			switch (op.op) {
				case "add":
					rateMap.set(op.rate.id, op.rate);
					break;
				case "remove":
					rateMap.delete(op.id);
					break;
				case "update": {
					const existing = rateMap.get(op.id);
					if (existing) {
						rateMap.set(op.id, { ...existing, ...op.changes });
					}
					break;
				}
			}
		}
	}

	return Array.from(rateMap.values());
}

/**
 * Extracts the history of a specific rate over time.
 * Returns data points for trend charts.
 */
export function getRateTimeSeries(
	history: RatesHistoryFile,
	rateId: string,
): RateTimeSeries | null {
	const dataPoints: RateTimeSeries["dataPoints"] = [];
	let rateName = "";
	let lenderId = "";

	// Check if rate exists in baseline
	const baselineRate = history.baseline.rates.find((r) => r.id === rateId);
	if (baselineRate) {
		rateName = baselineRate.name;
		lenderId = baselineRate.lenderId;
		dataPoints.push({
			timestamp: history.baseline.timestamp,
			rate: baselineRate.rate,
			apr: baselineRate.apr,
		});
	}

	// Track current rate values
	let currentRate = baselineRate?.rate;
	let currentApr = baselineRate?.apr;
	let rateExists = !!baselineRate;

	// Walk through changesets
	for (const changeset of history.changesets) {
		for (const op of changeset.operations) {
			if (op.op === "add" && op.rate.id === rateId) {
				rateName = op.rate.name;
				lenderId = op.rate.lenderId;
				currentRate = op.rate.rate;
				currentApr = op.rate.apr;
				rateExists = true;
				dataPoints.push({
					timestamp: changeset.timestamp,
					rate: currentRate,
					apr: currentApr,
				});
			} else if (op.op === "remove" && op.id === rateId) {
				rateExists = false;
				// Rate was removed - could add a marker if needed
			} else if (op.op === "update" && op.id === rateId) {
				const hasRateChange =
					op.changes.rate !== undefined && op.changes.rate !== currentRate;
				const hasAprChange =
					op.changes.apr !== undefined && op.changes.apr !== currentApr;

				if (op.changes.rate !== undefined) currentRate = op.changes.rate;
				if (op.changes.apr !== undefined) currentApr = op.changes.apr;
				if (op.changes.name) rateName = op.changes.name;

				// Only add data point if rate or apr changed
				if (
					rateExists &&
					currentRate !== undefined &&
					(hasRateChange || hasAprChange)
				) {
					dataPoints.push({
						timestamp: changeset.timestamp,
						rate: currentRate,
						apr: currentApr,
					});
				}
			}
		}
	}

	if (dataPoints.length === 0) return null;

	return { rateId, rateName, lenderId, dataPoints };
}

/**
 * Gets all rate changes for a lender within a date range.
 * Useful for "what changed" views.
 */
export function getRateChanges(
	history: RatesHistoryFile,
	startDate?: Date,
	endDate?: Date,
): RateChange[] {
	const changes: RateChange[] = [];
	const start = startDate ? startDate.getTime() : 0;
	const end = endDate ? endDate.getTime() : Number.POSITIVE_INFINITY;

	let previousRates: Map<string, MortgageRate> | null = null;

	// Initialize with baseline if it's before our range
	const baselineTs = new Date(history.baseline.timestamp).getTime();
	if (baselineTs < start) {
		previousRates = new Map(history.baseline.rates.map((r) => [r.id, r]));
	} else if (baselineTs >= start && baselineTs <= end) {
		// Baseline is in range - all rates are "added"
		for (const rate of history.baseline.rates) {
			changes.push({
				rateId: rate.id,
				rateName: rate.name,
				timestamp: history.baseline.timestamp,
				previousRate: null,
				newRate: rate.rate,
				changeType: "added",
			});
		}
		previousRates = new Map(history.baseline.rates.map((r) => [r.id, r]));
	}

	// Walk through changesets
	for (const changeset of history.changesets) {
		const changesetTs = new Date(changeset.timestamp).getTime();

		// Skip changesets before our range but track state
		if (changesetTs < start) {
			if (!previousRates) {
				previousRates = new Map(history.baseline.rates.map((r) => [r.id, r]));
			}
			// Apply changeset to track current state
			for (const op of changeset.operations) {
				if (op.op === "add") {
					previousRates.set(op.rate.id, op.rate);
				} else if (op.op === "remove") {
					previousRates.delete(op.id);
				} else if (op.op === "update") {
					const existing = previousRates.get(op.id);
					if (existing) {
						previousRates.set(op.id, { ...existing, ...op.changes });
					}
				}
			}
			continue;
		}

		// Stop after our range
		if (changesetTs > end) break;

		// Ensure previousRates is initialized
		if (!previousRates) {
			previousRates = new Map(history.baseline.rates.map((r) => [r.id, r]));
		}

		// Record changes from this changeset
		for (const op of changeset.operations) {
			if (op.op === "add") {
				changes.push({
					rateId: op.rate.id,
					rateName: op.rate.name,
					timestamp: changeset.timestamp,
					previousRate: null,
					newRate: op.rate.rate,
					changeType: "added",
				});
				previousRates.set(op.rate.id, op.rate);
			} else if (op.op === "remove") {
				const existing = previousRates.get(op.id);
				changes.push({
					rateId: op.id,
					rateName: existing?.name ?? op.id,
					timestamp: changeset.timestamp,
					previousRate: existing?.rate ?? null,
					newRate: null,
					changeType: "removed",
				});
				previousRates.delete(op.id);
			} else if (op.op === "update") {
				const existing = previousRates.get(op.id);
				if (existing && op.changes.rate !== undefined) {
					const changeAmount = op.changes.rate - existing.rate;
					const changePercent = (changeAmount / existing.rate) * 100;
					changes.push({
						rateId: op.id,
						rateName: op.changes.name ?? existing.name,
						timestamp: changeset.timestamp,
						previousRate: existing.rate,
						newRate: op.changes.rate,
						changeType: "changed",
						changeAmount,
						changePercent,
					});
				}
				if (existing) {
					previousRates.set(op.id, { ...existing, ...op.changes });
				}
			}
		}
	}

	return changes;
}
