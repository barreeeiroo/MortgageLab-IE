/**
 * Wayback Machine (Internet Archive) utilities for fetching historical snapshots.
 */

export interface WaybackSnapshot {
    timestamp: string; // YYYYMMDDHHmmss format
    url: string; // Original URL
    mimeType: string;
    statusCode: string;
    digest: string; // Content hash for deduplication
}

export interface GetSnapshotsOptions {
    from?: string; // YYYYMMDD format
    to?: string; // YYYYMMDD format
    limit?: number; // Max snapshots to return
    statusFilter?: string; // e.g., "200" for only successful responses
}

/**
 * Query the Wayback Machine CDX API to get all snapshots for a URL.
 *
 * CDX API returns: [urlkey, timestamp, original, mimetype, statuscode, digest, length]
 *
 * @see https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server
 */
export async function getSnapshots(
    url: string,
    options: GetSnapshotsOptions = {},
): Promise<WaybackSnapshot[]> {
    const params = new URLSearchParams({
        url,
        output: "json",
        fl: "timestamp,original,mimetype,statuscode,digest",
        collapse: "digest", // Deduplicate by content hash
    });

    if (options.from) {
        params.set("from", options.from);
    }
    if (options.to) {
        params.set("to", options.to);
    }
    if (options.limit) {
        params.set("limit", String(options.limit));
    }
    if (options.statusFilter) {
        params.set("filter", `statuscode:${options.statusFilter}`);
    }

    const cdxUrl = `https://web.archive.org/cdx/search/cdx?${params.toString()}`;

    // Retry logic for transient 504 errors
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(cdxUrl);

            if (!response.ok) {
                // Retry on 502, 503, 504 gateway errors
                if (
                    [502, 503, 504].includes(response.status) &&
                    attempt < maxRetries
                ) {
                    const delayMs = attempt * 2000; // 2s, 4s, 6s
                    await new Promise((resolve) =>
                        setTimeout(resolve, delayMs),
                    );
                    continue;
                }
                throw new Error(
                    `Wayback CDX API error: ${response.status} ${response.statusText}`,
                );
            }

            const data = (await response.json()) as string[][];

            // First row is header: ["timestamp", "original", "mimetype", "statuscode", "digest"]
            if (data.length <= 1) {
                return [];
            }

            // Skip header row
            return data
                .slice(1)
                .map(([timestamp, original, mimetype, statuscode, digest]) => ({
                    timestamp,
                    url: original,
                    mimeType: mimetype,
                    statusCode: statuscode,
                    digest,
                }));
        } catch (error) {
            lastError =
                error instanceof Error ? error : new Error(String(error));
            if (attempt < maxRetries) {
                const delayMs = attempt * 2000;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }

    throw lastError ?? new Error("Failed to fetch snapshots after retries");
}

/**
 * Build the Wayback Machine URL for a specific snapshot.
 */
export function getSnapshotUrl(snapshot: WaybackSnapshot): string {
    // id_ modifier returns raw content without Wayback toolbar injection
    return `https://web.archive.org/web/${snapshot.timestamp}id_/${snapshot.url}`;
}

/**
 * Fetch the HTML content of a Wayback Machine snapshot.
 */
export async function fetchSnapshot(
    snapshot: WaybackSnapshot,
): Promise<string> {
    const url = getSnapshotUrl(snapshot);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Failed to fetch snapshot: ${response.status} ${response.statusText} (${url})`,
        );
    }

    return response.text();
}

/**
 * Convert a Wayback timestamp (YYYYMMDDHHmmss) to ISO date string.
 */
export function timestampToIso(timestamp: string): string {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

/**
 * Convert an ISO date or YYYY-MM-DD to Wayback format (YYYYMMDD).
 */
export function dateToWaybackFormat(date: string): string {
    return date.replace(/-/g, "").slice(0, 8);
}

/**
 * Deduplicate snapshots by digest, keeping the earliest of each unique content.
 * Note: CDX API already does this if collapse=digest is used, but this is a safety check.
 */
export function deduplicateSnapshots(
    snapshots: WaybackSnapshot[],
): WaybackSnapshot[] {
    const seen = new Set<string>();
    return snapshots.filter((s) => {
        if (seen.has(s.digest)) {
            return false;
        }
        seen.add(s.digest);
        return true;
    });
}

/**
 * Find the closest snapshot to a target timestamp.
 *
 * @param snapshots - Array of snapshots to search
 * @param targetTimestamp - Target timestamp (YYYYMMDDHHmmss)
 * @param maxDiffDays - Maximum allowed difference in days (default 30)
 * @returns The closest snapshot, or null if none within maxDiffDays
 */
export function findClosestSnapshot(
    snapshots: WaybackSnapshot[],
    targetTimestamp: string,
    maxDiffDays = 30,
): WaybackSnapshot | null {
    if (snapshots.length === 0) return null;

    const targetTime = parseTimestamp(targetTimestamp);
    const maxDiffMs = maxDiffDays * 24 * 60 * 60 * 1000;

    let closest: WaybackSnapshot | null = null;
    let closestDiff = Number.POSITIVE_INFINITY;

    for (const snapshot of snapshots) {
        const snapshotTime = parseTimestamp(snapshot.timestamp);
        const diff = Math.abs(snapshotTime - targetTime);

        if (diff < closestDiff && diff <= maxDiffMs) {
            closestDiff = diff;
            closest = snapshot;
        }
    }

    return closest;
}

/**
 * Parse a Wayback timestamp (YYYYMMDDHHmmss) to milliseconds since epoch.
 */
function parseTimestamp(timestamp: string): number {
    const year = Number.parseInt(timestamp.slice(0, 4), 10);
    const month = Number.parseInt(timestamp.slice(4, 6), 10) - 1;
    const day = Number.parseInt(timestamp.slice(6, 8), 10);
    const hour = Number.parseInt(timestamp.slice(8, 10) || "0", 10);
    const minute = Number.parseInt(timestamp.slice(10, 12) || "0", 10);
    const second = Number.parseInt(timestamp.slice(12, 14) || "0", 10);

    return Date.UTC(year, month, day, hour, minute, second);
}
