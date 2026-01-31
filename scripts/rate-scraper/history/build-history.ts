/**
 * Build rate history files from historical scrape results.
 *
 * Takes HistoricalScrapeResult[] and generates a RatesHistoryFile
 * with baseline and changesets.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { MortgageRate } from "@/lib/schemas/rate";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";
import { computeDiffOperations } from "./changeset";
import type { HistoricalScrapeResult } from "./historical";

const HISTORY_DIR = join(import.meta.dir, "../../../data/rates/history");
const RATES_DIR = join(import.meta.dir, "../../../data/rates");

export interface BuildHistoryOptions {
    /**
     * If true, merge with existing history file rather than replacing.
     * Historical results will be prepended before existing baseline.
     */
    mergeWithExisting?: boolean;

    /**
     * If true, validate that final hash matches current rates file.
     */
    validateAgainstCurrent?: boolean;
}

export interface BuildHistoryReport {
    lenderId: string;
    baselineTimestamp: string;
    baselineRatesCount: number;
    changesetsCount: number;
    finalHash: string;
    currentRatesHash?: string;
    hashesMatch?: boolean;
}

/**
 * Load the current rates file for a lender.
 */
async function loadCurrentRates(
    lenderId: string,
): Promise<{ rates: MortgageRate[]; hash: string } | null> {
    try {
        const filePath = join(RATES_DIR, `${lenderId}.json`);
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        return {
            rates: data.rates,
            hash: data.ratesHash,
        };
    } catch {
        return null;
    }
}

/**
 * Load existing history file for a lender.
 */
async function loadExistingHistory(
    lenderId: string,
): Promise<RatesHistoryFile | null> {
    try {
        const filePath = join(HISTORY_DIR, `${lenderId}.json`);
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content);
    } catch {
        return null;
    }
}

/**
 * Build a history file from historical scrape results.
 *
 * @param lenderId - The lender ID
 * @param results - Chronologically sorted historical scrape results (oldest first)
 * @param options - Build options
 * @returns The built history file and a report
 */
export async function buildHistoryFromResults(
    lenderId: string,
    results: HistoricalScrapeResult[],
    options: BuildHistoryOptions = {},
): Promise<{ history: RatesHistoryFile; report: BuildHistoryReport }> {
    if (results.length === 0) {
        throw new Error("Cannot build history from empty results");
    }

    // Sort by timestamp (oldest first)
    const sorted = [...results].sort(
        (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    // First result becomes baseline
    const baseline = sorted[0];
    const history: RatesHistoryFile = {
        lenderId,
        baseline: {
            timestamp: baseline.timestamp,
            ratesHash: baseline.hash,
            rates: baseline.rates,
        },
        changesets: [],
    };

    // Build changesets for subsequent results
    let previousRates = baseline.rates;
    let previousHash = baseline.hash;

    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];

        // Skip if hash is same as previous (no changes)
        if (current.hash === previousHash) {
            continue;
        }

        // Compute diff operations
        const operations = computeDiffOperations(previousRates, current.rates);

        if (operations.length > 0) {
            history.changesets.push({
                timestamp: current.timestamp,
                afterHash: current.hash,
                operations,
            });
        }

        previousRates = current.rates;
        previousHash = current.hash;
    }

    // If merging with existing, bridge to existing and append changesets we don't have
    if (options.mergeWithExisting) {
        const existing = await loadExistingHistory(lenderId);
        if (existing) {
            // Check if our history already reaches current rates
            const current = await loadCurrentRates(lenderId);
            if (current && previousHash === current.hash) {
                // Our historical data is complete, no need to merge
                console.log(
                    "Historical data reaches current rates, skipping merge with existing",
                );
            } else {
                // Find where our history connects to existing history
                // Check if previousHash matches any point in existing history
                let connectionIndex = -1;

                // Check existing baseline
                if (previousHash === existing.baseline.ratesHash) {
                    connectionIndex = 0; // Connected at baseline, append all changesets
                } else {
                    // Check existing changesets
                    for (let i = 0; i < existing.changesets.length; i++) {
                        if (previousHash === existing.changesets[i].afterHash) {
                            connectionIndex = i + 1; // Connected after this changeset
                            break;
                        }
                    }
                }

                if (connectionIndex >= 0) {
                    // Our history already includes part of existing, only append what we don't have
                    const changesetsToAppend =
                        existing.changesets.slice(connectionIndex);
                    if (changesetsToAppend.length > 0) {
                        history.changesets.push(...changesetsToAppend);
                        previousHash =
                            changesetsToAppend[changesetsToAppend.length - 1]
                                .afterHash;
                    }
                } else {
                    // No connection found - bridge to existing baseline and append all
                    const existingBaselineHash = existing.baseline.ratesHash;

                    if (previousHash !== existingBaselineHash) {
                        // There's a gap - add a changeset to bridge
                        const bridgeOps = computeDiffOperations(
                            previousRates,
                            existing.baseline.rates,
                        );
                        if (bridgeOps.length > 0) {
                            history.changesets.push({
                                timestamp: existing.baseline.timestamp,
                                afterHash: existingBaselineHash,
                                operations: bridgeOps,
                            });
                        }
                        previousHash = existingBaselineHash;
                    }

                    // Append all existing changesets
                    if (existing.changesets.length > 0) {
                        history.changesets.push(...existing.changesets);
                        previousHash =
                            existing.changesets[existing.changesets.length - 1]
                                .afterHash;
                    }
                }
            }
        }
    }

    // Build report
    const report: BuildHistoryReport = {
        lenderId,
        baselineTimestamp: history.baseline.timestamp,
        baselineRatesCount: history.baseline.rates.length,
        changesetsCount: history.changesets.length,
        finalHash: previousHash,
    };

    // Validate against current rates if requested
    if (options.validateAgainstCurrent) {
        const current = await loadCurrentRates(lenderId);
        if (current) {
            report.currentRatesHash = current.hash;
            report.hashesMatch = previousHash === current.hash;
        }
    }

    return { history, report };
}

/**
 * Save a history file to disk.
 */
export async function saveHistoryFile(
    history: RatesHistoryFile,
): Promise<void> {
    const filePath = join(HISTORY_DIR, `${history.lenderId}.json`);
    await writeFile(filePath, JSON.stringify(history, null, "\t"));
}

/**
 * Preview what the history would look like without saving.
 */
export function previewHistory(history: RatesHistoryFile): void {
    console.log(`\nHistory Preview for ${history.lenderId}`);
    console.log("=".repeat(50));
    console.log(`Baseline: ${history.baseline.timestamp}`);
    console.log(`  Rates: ${history.baseline.rates.length}`);
    console.log(`  Hash: ${history.baseline.ratesHash.slice(0, 12)}...`);

    if (history.changesets.length > 0) {
        console.log(`\nChangesets (${history.changesets.length}):`);
        for (const changeset of history.changesets) {
            const adds = changeset.operations.filter(
                (o) => o.op === "add",
            ).length;
            const removes = changeset.operations.filter(
                (o) => o.op === "remove",
            ).length;
            const updates = changeset.operations.filter(
                (o) => o.op === "update",
            ).length;
            console.log(`  ${changeset.timestamp}:`);
            console.log(
                `    Operations: ${adds} adds, ${removes} removes, ${updates} updates`,
            );
            console.log(
                `    After hash: ${changeset.afterHash.slice(0, 12)}...`,
            );
        }
    } else {
        console.log("\nNo changesets (rates unchanged since baseline)");
    }
}
