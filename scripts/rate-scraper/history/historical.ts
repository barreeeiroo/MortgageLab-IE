/**
 * Historical scraping infrastructure using Wayback Machine.
 *
 * Fetches archived snapshots of lender rate pages and parses them
 * using existing scraper logic.
 */

import type { MortgageRate } from "@/lib/schemas/rate";
import { computeRatesHash } from "../utils/hash";
import type { HistoricalLenderProvider, LenderProvider } from "../utils/types";
import {
    dateToWaybackFormat,
    fetchSnapshot,
    findClosestSnapshot,
    type GetSnapshotsOptions,
    getSnapshots,
    timestampToIso,
    type WaybackSnapshot,
} from "./wayback";

export interface HistoricalScrapeResult {
    timestamp: string; // ISO format
    waybackTimestamp: string; // YYYYMMDDHHmmss format
    rates: MortgageRate[];
    hash: string;
}

export interface HistoricalScrapeOptions {
    fromDate?: string; // YYYY-MM-DD
    toDate?: string; // YYYY-MM-DD
    maxSnapshots?: number; // Limit for testing
    dryRun?: boolean; // If true, only list snapshots without fetching
    onProgress?: (message: string) => void;
    onError?: (snapshot: WaybackSnapshot, error: Error) => void;
}

export interface HistoricalScrapeReport {
    lenderId: string;
    url: string;
    snapshotsFound: number;
    snapshotsParsed: number;
    snapshotsFailed: number;
    uniqueHashes: number;
    results: HistoricalScrapeResult[];
    errors: { timestamp: string; error: string }[];
    stoppedEarly: boolean;
    stopReason?: string;
}

/**
 * Check if a provider supports historical scraping (has parseHtml method).
 */
export function isHistoricalProvider(
    provider: LenderProvider,
): provider is HistoricalLenderProvider {
    return "parseHtml" in provider && typeof provider.parseHtml === "function";
}

/**
 * Scrape historical rates for a lender using Wayback Machine.
 *
 * @param provider - The lender provider (must have parseHtml method)
 * @param options - Scraping options
 * @returns Report with all scraped results and metadata
 */
export async function scrapeHistorical(
    provider: HistoricalLenderProvider,
    options: HistoricalScrapeOptions = {},
): Promise<HistoricalScrapeReport> {
    const log = options.onProgress ?? console.log;
    const { fromDate, toDate, maxSnapshots, dryRun = false } = options;

    const report: HistoricalScrapeReport = {
        lenderId: provider.lenderId,
        url: provider.url,
        snapshotsFound: 0,
        snapshotsParsed: 0,
        snapshotsFailed: 0,
        uniqueHashes: 0,
        results: [],
        errors: [],
        stoppedEarly: false,
    };

    // Build CDX query options
    const cdxOptions: GetSnapshotsOptions = {
        statusFilter: "200", // Only successful responses
    };
    if (fromDate) {
        cdxOptions.from = dateToWaybackFormat(fromDate);
    }
    if (toDate) {
        cdxOptions.to = dateToWaybackFormat(toDate);
    }
    if (maxSnapshots) {
        cdxOptions.limit = maxSnapshots;
    }

    // Query current URL
    log(`Querying Wayback Machine for ${provider.url}...`);
    const currentSnapshots = await getSnapshots(provider.url, cdxOptions);
    log(`  Found ${currentSnapshots.length} snapshots from current URL`);

    // Query legacy URL if available
    let legacySnapshots: WaybackSnapshot[] = [];
    if (provider.legacyUrl) {
        log(`Querying Wayback Machine for legacy URL ${provider.legacyUrl}...`);
        legacySnapshots = await getSnapshots(provider.legacyUrl, cdxOptions);
        log(`  Found ${legacySnapshots.length} snapshots from legacy URL`);
    }

    // Query additional URLs if available (for multi-page providers like ICS)
    const additionalSnapshotsMap = new Map<string, WaybackSnapshot[]>();
    if (provider.additionalUrls && provider.additionalUrls.length > 0) {
        for (const additionalUrl of provider.additionalUrls) {
            log(
                `Querying Wayback Machine for additional URL ${additionalUrl}...`,
            );
            const additionalSnapshots = await getSnapshots(
                additionalUrl,
                cdxOptions,
            );
            log(`  Found ${additionalSnapshots.length} snapshots`);
            additionalSnapshotsMap.set(additionalUrl, additionalSnapshots);
        }
    }

    // Combine and deduplicate by digest
    const allSnapshotsMap = new Map<string, WaybackSnapshot>();
    for (const s of [...currentSnapshots, ...legacySnapshots]) {
        if (!allSnapshotsMap.has(s.digest)) {
            allSnapshotsMap.set(s.digest, s);
        }
    }

    // Sort by timestamp (oldest first)
    const snapshots = Array.from(allSnapshotsMap.values()).sort((a, b) =>
        a.timestamp.localeCompare(b.timestamp),
    );

    report.snapshotsFound = snapshots.length;

    log(
        `Found ${snapshots.length} unique snapshots (deduplicated by content hash)`,
    );

    if (dryRun) {
        log("\nDry run - listing snapshots without fetching:\n");
        for (const snapshot of snapshots) {
            log(
                `  ${timestampToIso(snapshot.timestamp)} - digest: ${snapshot.digest.slice(0, 8)}...`,
            );
        }
        return report;
    }

    if (snapshots.length === 0) {
        return report;
    }

    // Track seen rate hashes to avoid duplicate results
    const seenHashes = new Set<string>();

    for (const snapshot of snapshots) {
        const isoTimestamp = timestampToIso(snapshot.timestamp);
        log(`\nProcessing snapshot from ${isoTimestamp}...`);

        try {
            // Fetch archived HTML
            const html = await fetchSnapshot(snapshot);
            log(`  Fetched ${html.length} bytes from main URL`);

            // Fetch additional URLs if available (for multi-page providers)
            const additionalHtmls: Record<string, string> = {};
            if (additionalSnapshotsMap.size > 0) {
                for (const [url, urlSnapshots] of additionalSnapshotsMap) {
                    const closestSnapshot = findClosestSnapshot(
                        urlSnapshots,
                        snapshot.timestamp,
                        30, // Max 30 days difference
                    );
                    if (closestSnapshot) {
                        try {
                            const additionalHtml =
                                await fetchSnapshot(closestSnapshot);
                            additionalHtmls[url] = additionalHtml;
                            log(
                                `  Fetched ${additionalHtml.length} bytes from ${url} (snapshot from ${timestampToIso(closestSnapshot.timestamp)})`,
                            );
                        } catch (fetchError) {
                            log(
                                `  ⚠ Failed to fetch additional URL ${url}: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
                            );
                        }
                    } else {
                        log(`  ⚠ No matching snapshot found for ${url}`);
                    }
                }
            }

            // Validate structure if provider supports it
            if (provider.validateStructure) {
                const validation = provider.validateStructure(
                    html,
                    additionalHtmls,
                );
                if (!validation.valid) {
                    report.stoppedEarly = true;
                    report.stopReason = `Structure validation failed at ${isoTimestamp}: ${validation.error}`;
                    log(`  ⛔ ${report.stopReason}`);
                    log(
                        "  Stopping historical scrape - DOM structure has changed",
                    );
                    break;
                }
                log("  ✓ Structure validation passed");
            }

            // Parse rates from HTML
            const rates = await provider.parseHtml(html, additionalHtmls);
            log(`  Parsed ${rates.length} rates`);

            if (rates.length === 0) {
                log("  ⚠ No rates found, skipping");
                report.snapshotsFailed++;
                report.errors.push({
                    timestamp: isoTimestamp,
                    error: "No rates found in snapshot",
                });
                continue;
            }

            // Compute hash
            const hash = computeRatesHash(rates);

            // Skip if we've already seen this exact rate set
            if (seenHashes.has(hash)) {
                log("  ⏭ Duplicate hash, skipping");
                continue;
            }
            seenHashes.add(hash);

            report.results.push({
                timestamp: isoTimestamp,
                waybackTimestamp: snapshot.timestamp,
                rates,
                hash,
            });
            report.snapshotsParsed++;
            log(`  ✓ Added result (hash: ${hash.slice(0, 8)}...)`);
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            log(`  ✗ Error: ${errorMessage}`);
            report.snapshotsFailed++;
            report.errors.push({
                timestamp: isoTimestamp,
                error: errorMessage,
            });

            // Call error handler if provided
            if (options.onError) {
                options.onError(
                    snapshot,
                    error instanceof Error ? error : new Error(errorMessage),
                );
            }
        }
    }

    report.uniqueHashes = seenHashes.size;

    log(`\n${"=".repeat(60)}`);
    log(`Historical scrape complete for ${provider.lenderId}`);
    log(`  Snapshots found: ${report.snapshotsFound}`);
    log(`  Successfully parsed: ${report.snapshotsParsed}`);
    log(`  Failed: ${report.snapshotsFailed}`);
    log(`  Unique rate sets: ${report.uniqueHashes}`);
    if (report.stoppedEarly) {
        log(`  ⚠ Stopped early: ${report.stopReason}`);
    }

    return report;
}
