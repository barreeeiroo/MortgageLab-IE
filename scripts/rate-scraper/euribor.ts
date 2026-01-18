#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	EURIBOR_TENORS,
	type EuriborFile,
	EuriborFileSchema,
	type EuriborRate,
	type EuriborTenor,
} from "@/lib/schemas/euribor";

/**
 * ECB API endpoints for Euribor rates
 * Each endpoint returns monthly averages for the given tenor
 */
const ECB_URLS: Record<EuriborTenor, string> = {
	"1M": "https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR1MD_.HSTA",
	"3M": "https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR3MD_.HSTA",
	"6M": "https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR6MD_.HSTA",
	"12M":
		"https://data.ecb.europa.eu/data-detail-api/FM.M.U2.EUR.RT.MM.EURIBOR1YD_.HSTA",
};

// Only include data from 2017-01-01 onwards (matches lender history baseline)
const MIN_DATE = "2017-01-01";

interface ECBDataPoint {
	OBS: string;
	PERIOD: string;
}

/**
 * Fetch Euribor rates for a single tenor from ECB API
 */
async function fetchTenor(tenor: EuriborTenor): Promise<Map<string, number>> {
	const url = ECB_URLS[tenor];
	console.log(`Fetching ${tenor} rates from ECB...`);

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch ${tenor}: ${response.status} ${response.statusText}`,
		);
	}

	const data = (await response.json()) as ECBDataPoint[];
	const rates = new Map<string, number>();

	for (const point of data) {
		// PERIOD format is "YYYY-MM-DD"
		const date = point.PERIOD;
		if (date < MIN_DATE) continue;

		// Use OBS for standard 4 decimal place precision
		const rate = Number.parseFloat(point.OBS);
		if (!Number.isNaN(rate)) {
			rates.set(date, rate);
		}
	}

	console.log(`  Found ${rates.size} data points for ${tenor}`);
	return rates;
}

/**
 * Merge tenor data into row format { date, 1M, 3M, 6M, 12M }
 */
function mergeRates(
	tenorData: Map<EuriborTenor, Map<string, number>>,
): EuriborRate[] {
	// Collect all unique dates
	const allDates = new Set<string>();
	for (const rates of tenorData.values()) {
		for (const date of rates.keys()) {
			allDates.add(date);
		}
	}

	// Build rows, only including dates that have all 4 tenors
	const rows: EuriborRate[] = [];
	for (const date of allDates) {
		const row: Record<string, string | number> = { date };
		let hasAllTenors = true;

		for (const tenor of EURIBOR_TENORS) {
			const rate = tenorData.get(tenor)?.get(date);
			if (rate === undefined) {
				hasAllTenors = false;
				break;
			}
			row[tenor] = rate;
		}

		if (hasAllTenors) {
			rows.push(row as EuriborRate);
		}
	}

	// Sort chronologically
	rows.sort((a, b) => a.date.localeCompare(b.date));
	return rows;
}

/**
 * Compute SHA256 hash of rates for change detection
 */
function computeHash(rates: EuriborRate[]): string {
	const json = JSON.stringify(rates);
	return createHash("sha256").update(json).digest("hex");
}

/**
 * Read existing Euribor file
 */
async function readExistingFile(path: string): Promise<EuriborFile | null> {
	try {
		const content = await readFile(path, "utf-8");
		const parsed = JSON.parse(content);
		return EuriborFileSchema.parse(parsed);
	} catch {
		return null;
	}
}

async function main() {
	console.log("Fetching Euribor rates from ECB API...\n");

	// Fetch all tenors in parallel
	const tenorPromises = EURIBOR_TENORS.map(
		async (tenor) => [tenor, await fetchTenor(tenor)] as const,
	);
	const tenorResults = await Promise.all(tenorPromises);
	const tenorData = new Map<EuriborTenor, Map<string, number>>(tenorResults);

	// Merge into row format
	const rates = mergeRates(tenorData);
	const newHash = computeHash(rates);
	const now = new Date().toISOString();

	console.log(`\nMerged ${rates.length} complete rows (all 4 tenors present)`);

	// Read existing file
	const outputPath = join(
		import.meta.dir,
		"../../data/rates/history/_euribor.json",
	);
	const existing = await readExistingFile(outputPath);

	let lastUpdatedAt: string;
	if (!existing) {
		lastUpdatedAt = now;
		console.log("\nNo existing file found, creating new one");
	} else if (existing.dataHash !== newHash) {
		lastUpdatedAt = now;
		const oldCount = existing.rates.length;
		const newCount = rates.length;
		console.log("\nRates have CHANGED since last scrape");
		console.log(`  Old hash: ${existing.dataHash}`);
		console.log(`  New hash: ${newHash}`);
		console.log(
			`  Rows: ${oldCount} -> ${newCount} (${newCount - oldCount > 0 ? "+" : ""}${newCount - oldCount})`,
		);
	} else {
		lastUpdatedAt = existing.lastUpdatedAt;
		console.log("\nRates UNCHANGED since last scrape");
		console.log(`  Hash: ${newHash}`);
	}

	// Write output
	const output: EuriborFile = {
		lastScrapedAt: now,
		lastUpdatedAt,
		dataHash: newHash,
		rates,
	};

	await writeFile(outputPath, JSON.stringify(output, null, "\t"));

	// Print summary
	console.log("\nSuccessfully scraped Euribor rates");
	console.log(`  Total rows: ${rates.length}`);
	console.log(
		`  Date range: ${rates[0]?.date} to ${rates[rates.length - 1]?.date}`,
	);
	console.log(`  Last scraped: ${output.lastScrapedAt}`);
	console.log(`  Last updated: ${output.lastUpdatedAt}`);
	console.log(`  Data hash: ${output.dataHash}`);
	console.log(`  Output: ${outputPath}`);

	// Validate rate ranges
	let minRate = Number.POSITIVE_INFINITY;
	let maxRate = Number.NEGATIVE_INFINITY;
	for (const row of rates) {
		for (const tenor of EURIBOR_TENORS) {
			const rate = row[tenor];
			if (rate < minRate) minRate = rate;
			if (rate > maxRate) maxRate = rate;
		}
	}
	console.log(
		`\n  Rate range: ${minRate.toFixed(3)}% to ${maxRate.toFixed(3)}%`,
	);
}

main().catch((error) => {
	console.error("Failed to scrape Euribor rates:", error);
	process.exit(1);
});
