/**
 * Data fetching utilities for Euribor rate data.
 * All fetch functions use getPath to handle base path correctly.
 */

import {
    type EuriborFile,
    EuriborFileSchema,
    type EuriborTenor,
} from "@/lib/schemas/euribor";
import type { RateTimeSeries } from "@/lib/schemas/rate-history";
import { getPath } from "@/lib/utils/path";

/**
 * Fetch Euribor data from the JSON file.
 * @returns Euribor file data, or null on error
 */
export async function fetchEuriborData(): Promise<EuriborFile | null> {
    try {
        const res = await fetch(getPath("data/rates/history/_euribor.json"));
        if (!res.ok) return null;
        const json = await res.json();
        return EuriborFileSchema.parse(json);
    } catch {
        return null;
    }
}

/**
 * Transform Euribor data for a specific tenor into a RateTimeSeries format.
 * @param data - The Euribor file data
 * @param tenor - The tenor to extract (1M, 3M, 6M, 12M)
 * @returns RateTimeSeries compatible data
 */
export function getEuriborTimeSeries(
    data: EuriborFile,
    tenor: EuriborTenor,
): RateTimeSeries {
    return {
        rateId: `euribor-${tenor}`,
        rateName: `Euribor ${tenor}`,
        lenderId: "_euribor",
        dataPoints: data.rates.map((rate) => ({
            timestamp: new Date(rate.date).toISOString(),
            rate: rate[tenor],
        })),
    };
}
