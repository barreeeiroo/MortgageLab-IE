#!/usr/bin/env bun

/**
 * Historical rate scraping CLI.
 *
 * Fetches archived rate pages from Wayback Machine and builds history files.
 */

import {
	buildHistoryFromResults,
	previewHistory,
	saveHistoryFile,
} from "./history/build-history";
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
import type { LenderProvider } from "./utils/types";

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

function printUsage() {
	console.error("Usage: bun run rates:scrape-historical <lender-id> [options]");
	console.error("");
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
	console.error("");
	console.error(
		`Historical-enabled lenders: ${Object.entries(providers)
			.filter(([_, p]) => isHistoricalProvider(p))
			.map(([id]) => id)
			.join(", ")}`,
	);
}

async function main() {
	const args = process.argv.slice(2);
	const lenderId = args.find((a) => !a.startsWith("--"));

	if (!lenderId) {
		printUsage();
		process.exit(1);
	}

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
			`Mode: BUILD HISTORY${mergeWithExisting ? " (merge with existing)" : ""}`,
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

main();
