#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RatesFile } from "@/lib/schemas/rate";
import {
	buildHistoryFromResults,
	previewHistory,
	saveHistoryFile,
} from "./history/build-history";
import { appendChangeset, ensureHistoryExists } from "./history/changeset";
import { isHistoricalProvider, scrapeHistorical } from "./history/historical";
import { aibProvider } from "./providers/aib";
import { avantProvider } from "./providers/avant";
import { boiProvider } from "./providers/boi";
import { cuProvider } from "./providers/cu";
import { ebsProvider } from "./providers/ebs";
import { havenProvider } from "./providers/haven";
import { icsProvider } from "./providers/ics";
import { mocoProvider } from "./providers/moco";
import { nuaProvider } from "./providers/nua";
import { ptsbProvider } from "./providers/ptsb";
import { computeRatesHash } from "./utils/hash";
import type { LenderProvider } from "./utils/types";

interface RateDiff {
	added: number;
	removed: number;
	updated: number;
}

interface LenderResult {
	lenderId: string;
	success: boolean;
	diff: RateDiff | null;
}

function computeRateDiff(
	oldRates: { id: string }[],
	newRates: { id: string }[],
): RateDiff {
	const oldById = new Map(oldRates.map((r) => [r.id, JSON.stringify(r)]));
	const newById = new Map(newRates.map((r) => [r.id, JSON.stringify(r)]));

	let added = 0;
	let removed = 0;
	let updated = 0;

	for (const [id, newJson] of newById) {
		const oldJson = oldById.get(id);
		if (!oldJson) {
			added++;
		} else if (oldJson !== newJson) {
			updated++;
		}
	}

	for (const id of oldById.keys()) {
		if (!newById.has(id)) {
			removed++;
		}
	}

	return { added, removed, updated };
}

const providers: Record<string, LenderProvider> = {
	aib: aibProvider,
	avant: avantProvider,
	boi: boiProvider,
	cu: cuProvider,
	ebs: ebsProvider,
	haven: havenProvider,
	ics: icsProvider,
	moco: mocoProvider,
	nua: nuaProvider,
	ptsb: ptsbProvider,
};

async function readExistingRatesFile(
	filePath: string,
): Promise<RatesFile | null> {
	try {
		const content = await readFile(filePath, "utf-8");
		const parsed = JSON.parse(content);

		// Handle old format (plain array) for backward compatibility
		if (Array.isArray(parsed)) {
			return null; // Treat as no existing file, will create new format
		}

		return parsed as RatesFile;
	} catch {
		return null;
	}
}

async function scrapeProvider(
	lenderId: string,
	provider: LenderProvider,
): Promise<LenderResult> {
	console.log(`Scraping rates from ${provider.name}...`);
	console.log(`URL: ${provider.url}\n`);

	try {
		const newRates = await provider.scrape();
		const now = new Date().toISOString();
		const newHash = computeRatesHash(newRates);

		const outputPath = join(
			import.meta.dir,
			"../../data/rates",
			`${lenderId}.json`,
		);

		// Read existing file to check for changes
		const existing = await readExistingRatesFile(outputPath);

		let lastUpdatedAt: string;
		let diff: RateDiff | null = null;

		if (!existing) {
			// First time scraping this lender
			lastUpdatedAt = now;
			diff = { added: newRates.length, removed: 0, updated: 0 };
			console.log("No existing rates file found, creating new one");
			// Create history baseline
			await appendChangeset(lenderId, newRates, newHash, now);
		} else if (existing.ratesHash !== newHash) {
			// Rates have changed
			lastUpdatedAt = now;
			diff = computeRateDiff(existing.rates, newRates);
			console.log("Rates have CHANGED since last scrape");
			console.log(`  Old hash: ${existing.ratesHash}`);
			console.log(`  New hash: ${newHash}`);
			// Append changeset to history
			await appendChangeset(lenderId, newRates, newHash, now);
		} else {
			// Rates unchanged, keep the old timestamp
			lastUpdatedAt = existing.lastUpdatedAt;
			console.log("Rates UNCHANGED since last scrape");
			console.log(`  Hash: ${newHash}`);
			// Ensure history exists (creates baseline if missing)
			await ensureHistoryExists(
				lenderId,
				newRates,
				newHash,
				existing.lastUpdatedAt,
			);
		}

		const ratesFile: RatesFile = {
			lenderId,
			lastScrapedAt: now,
			lastUpdatedAt,
			ratesHash: newHash,
			rates: newRates,
		};

		await writeFile(outputPath, JSON.stringify(ratesFile, null, "\t"));

		console.log(`\nSuccessfully scraped ${newRates.length} rates`);
		console.log(`Last scraped at: ${ratesFile.lastScrapedAt}`);
		console.log(
			`Last updated at: ${ratesFile.lastUpdatedAt}${diff ? " (UPDATED)" : ""}`,
		);
		console.log(`Rates hash: ${ratesFile.ratesHash}`);
		console.log(`Output written to: ${outputPath}`);

		return { lenderId, success: true, diff };
	} catch (error) {
		console.error("Failed to scrape rates:", error);
		return { lenderId, success: false, diff: null };
	}
}

function formatCommitDescription(results: LenderResult[]): string {
	const changed = results.filter((r) => r.success && r.diff !== null);

	if (changed.length === 0) {
		return "";
	}

	const lines: string[] = [];
	for (const { lenderId, diff } of changed) {
		if (!diff) continue;
		const parts: string[] = [];
		if (diff.added > 0) parts.push(`${diff.added} added`);
		if (diff.updated > 0) parts.push(`${diff.updated} updated`);
		if (diff.removed > 0) parts.push(`${diff.removed} removed`);
		lines.push(`- ${lenderId}: ${parts.join(", ")}`);
	}

	return lines.join("\n");
}

async function runHistoricalScrape(lenderId: string, args: string[]) {
	const provider = providers[lenderId];

	if (!provider) {
		console.error(`Unknown lender: ${lenderId}`);
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	if (!isHistoricalProvider(provider)) {
		console.error(`Provider ${lenderId} does not support historical scraping`);
		console.error("Historical providers must implement parseHtml() method");
		process.exit(1);
	}

	// Parse options
	const dryRun = args.includes("--dry-run");
	const buildHistory = args.includes("--build");
	const mergeWithExisting = args.includes("--merge");
	const fromArg = args.find((a) => a.startsWith("--from="));
	const toArg = args.find((a) => a.startsWith("--to="));
	const maxArg = args.find((a) => a.startsWith("--max="));

	const fromDate = fromArg?.split("=")[1];
	const toDate = toArg?.split("=")[1];
	const maxSnapshots = maxArg
		? Number.parseInt(maxArg.split("=")[1], 10)
		: undefined;

	console.log(`\n${"=".repeat(60)}`);
	console.log(`Historical scrape for ${provider.name} (${lenderId})`);
	console.log("=".repeat(60));
	console.log(`URL: ${provider.url}`);
	if (fromDate) console.log(`From: ${fromDate}`);
	if (toDate) console.log(`To: ${toDate}`);
	if (maxSnapshots) console.log(`Max snapshots: ${maxSnapshots}`);
	if (dryRun) console.log("Mode: DRY RUN (no fetching)");
	if (buildHistory)
		console.log(
			"Mode: BUILD HISTORY" +
				(mergeWithExisting ? " (merge with existing)" : ""),
		);
	console.log("");

	const report = await scrapeHistorical(provider, {
		fromDate,
		toDate,
		maxSnapshots,
		dryRun,
	});

	if (!dryRun && report.results.length > 0) {
		console.log(`\n${"=".repeat(60)}`);
		console.log("RESULTS SUMMARY");
		console.log("=".repeat(60));
		for (const result of report.results) {
			console.log(
				`  ${result.timestamp}: ${result.rates.length} rates (hash: ${result.hash.slice(0, 8)}...)`,
			);
		}

		// Build history if requested
		if (buildHistory) {
			console.log(`\n${"=".repeat(60)}`);
			console.log("BUILDING HISTORY FILE");
			console.log("=".repeat(60));

			const { history, report: buildReport } = await buildHistoryFromResults(
				lenderId,
				report.results,
				{
					mergeWithExisting,
					validateAgainstCurrent: true,
				},
			);

			previewHistory(history);

			console.log("\nBuild Report:");
			console.log(`  Baseline: ${buildReport.baselineTimestamp}`);
			console.log(`  Baseline rates: ${buildReport.baselineRatesCount}`);
			console.log(`  Changesets: ${buildReport.changesetsCount}`);
			console.log(`  Final hash: ${buildReport.finalHash.slice(0, 12)}...`);

			if (buildReport.currentRatesHash) {
				console.log(
					`  Current rates hash: ${buildReport.currentRatesHash.slice(0, 12)}...`,
				);
				if (buildReport.hashesMatch) {
					console.log(
						"  ✓ Hashes match - history is consistent with current rates",
					);
				} else {
					console.log(
						"  ⚠ Hashes DO NOT match - there may be a gap in history",
					);
				}
			}

			// Save the history file
			await saveHistoryFile(history);
			console.log(
				`\n✓ History file saved to data/rates/history/${lenderId}.json`,
			);
		}
	}

	if (report.errors.length > 0) {
		console.log("\nERRORS:");
		for (const error of report.errors) {
			console.log(`  ${error.timestamp}: ${error.error}`);
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const hasAll = args.includes("--all");
	const hasHistorical = args.includes("--historical");
	const writeUpdates = args.includes("--write-updates");
	const lenderId = args.find((a) => !a.startsWith("--"));

	// Historical scraping mode
	if (hasHistorical) {
		if (!lenderId) {
			console.error(
				"Usage: bun run rates:scrape --historical <lender-id> [options]",
			);
			console.error("Options:");
			console.error("  --from=YYYY-MM-DD  Start date for snapshots");
			console.error("  --to=YYYY-MM-DD    End date for snapshots");
			console.error("  --max=N            Maximum number of snapshots");
			console.error("  --dry-run          List snapshots without fetching");
			console.error(
				"  --build            Build and save history file from results",
			);
			console.error(
				"  --merge            Merge with existing history (use with --build)",
			);
			console.error(
				`\nHistorical-enabled lenders: ${Object.entries(providers)
					.filter(([_, p]) => isHistoricalProvider(p))
					.map(([id]) => id)
					.join(", ")}`,
			);
			process.exit(1);
		}
		await runHistoricalScrape(lenderId, args);
		return;
	}

	if (hasAll && lenderId) {
		console.error("Error: Cannot use --all with a specific lender");
		process.exit(1);
	}

	if (hasAll) {
		// Scrape all providers sequentially
		console.log("Scraping all providers...\n");
		const results: LenderResult[] = [];

		for (const [lenderId, provider] of Object.entries(providers)) {
			console.log(`\n${"=".repeat(60)}`);
			const result = await scrapeProvider(lenderId, provider);
			results.push(result);
		}

		// Print summary
		console.log(`\n${"=".repeat(60)}`);
		console.log("SUMMARY");
		console.log("=".repeat(60));
		const successful = results.filter((r) => r.success);
		const failed = results.filter((r) => !r.success);
		console.log(`Successful: ${successful.length}/${results.length}`);
		if (failed.length > 0) {
			console.log(`Failed: ${failed.map((r) => r.lenderId).join(", ")}`);
		}

		// Write updates file if requested
		if (writeUpdates) {
			const updatesPath = join(import.meta.dir, "../../data/rates/updates.txt");
			const description = formatCommitDescription(results);
			await writeFile(updatesPath, description);
			console.log(`\nUpdates written to: ${updatesPath}`);
		}

		if (results.some((r) => !r.success)) {
			process.exit(1);
		}
		return;
	}

	if (!lenderId) {
		console.error("Usage: bun run rates:scrape <lender-id>");
		console.error("       bun run rates:scrape --all [--write-updates]");
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	const provider = providers[lenderId];

	if (!provider) {
		console.error(`Unknown lender: ${lenderId}`);
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	const result = await scrapeProvider(lenderId, provider);
	if (!result.success) {
		process.exit(1);
	}
}

main();
