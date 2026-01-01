#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RatesFile } from "../../src/lib/schemas/rate";
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
import type { LenderProvider } from "./types";
import { computeRatesHash } from "./utils";

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
	jsonFormat: boolean,
): Promise<LenderResult> {
	if (!jsonFormat) {
		console.log(`Scraping rates from ${provider.name}...`);
		console.log(`URL: ${provider.url}\n`);
	}

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
			if (!jsonFormat) {
				console.log("No existing rates file found, creating new one");
			}
		} else if (existing.ratesHash !== newHash) {
			// Rates have changed
			lastUpdatedAt = now;
			diff = computeRateDiff(existing.rates, newRates);
			if (!jsonFormat) {
				console.log("Rates have CHANGED since last scrape");
				console.log(`  Old hash: ${existing.ratesHash}`);
				console.log(`  New hash: ${newHash}`);
			}
		} else {
			// Rates unchanged, keep the old timestamp
			lastUpdatedAt = existing.lastUpdatedAt;
			if (!jsonFormat) {
				console.log("Rates UNCHANGED since last scrape");
				console.log(`  Hash: ${newHash}`);
			}
		}

		const ratesFile: RatesFile = {
			lenderId,
			lastScrapedAt: now,
			lastUpdatedAt,
			ratesHash: newHash,
			rates: newRates,
		};

		await writeFile(outputPath, JSON.stringify(ratesFile, null, "\t"));

		if (!jsonFormat) {
			console.log(`\nSuccessfully scraped ${newRates.length} rates`);
			console.log(`Last scraped at: ${ratesFile.lastScrapedAt}`);
			console.log(
				`Last updated at: ${ratesFile.lastUpdatedAt}${diff ? " (UPDATED)" : ""}`,
			);
			console.log(`Rates hash: ${ratesFile.ratesHash}`);
			console.log(`Output written to: ${outputPath}`);
		}

		return { lenderId, success: true, diff };
	} catch (error) {
		if (!jsonFormat) {
			console.error("Failed to scrape rates:", error);
		}
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

async function main() {
	const args = process.argv.slice(2);
	const hasAll = args.includes("--all");
	const formatArg = args.find((a) => a.startsWith("--format="));
	const format = formatArg?.split("=")[1] ?? "text";
	const lenderId = args.find((a) => !a.startsWith("--"));

	if (hasAll && lenderId) {
		console.error("Error: Cannot use --all with a specific lender");
		process.exit(1);
	}

	const quiet = format !== "text";

	if (hasAll) {
		// Scrape all providers sequentially
		if (!quiet) {
			console.log("Scraping all providers...\n");
		}
		const results: LenderResult[] = [];

		for (const [lenderId, provider] of Object.entries(providers)) {
			if (!quiet) {
				console.log(`\n${"=".repeat(60)}`);
			}
			const result = await scrapeProvider(lenderId, provider, quiet);
			results.push(result);
		}

		if (format === "json") {
			console.log(JSON.stringify(results));
		} else if (format === "commit") {
			console.log(formatCommitDescription(results));
		} else {
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
		}

		if (results.some((r) => !r.success)) {
			process.exit(1);
		}
		return;
	}

	if (!lenderId) {
		console.error("Usage: bun run rates:scrape <lender-id>");
		console.error("       bun run rates:scrape --all [--format=json|commit]");
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	const provider = providers[lenderId];

	if (!provider) {
		console.error(`Unknown lender: ${lenderId}`);
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	const result = await scrapeProvider(lenderId, provider, quiet);
	if (format === "json") {
		console.log(JSON.stringify([result]));
	} else if (format === "commit") {
		console.log(formatCommitDescription([result]));
	}
	if (!result.success) {
		process.exit(1);
	}
}

main();
