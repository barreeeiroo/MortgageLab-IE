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

async function main() {
	const lenderId = process.argv[2];

	if (!lenderId) {
		console.error("Usage: bun run scrape:rates <lender-id>");
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

	const provider = providers[lenderId];

	if (!provider) {
		console.error(`Unknown lender: ${lenderId}`);
		console.error(`Available lenders: ${Object.keys(providers).join(", ")}`);
		process.exit(1);
	}

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
		let hashChanged = false;

		if (!existing) {
			// First time scraping this lender
			lastUpdatedAt = now;
			console.log("No existing rates file found, creating new one");
		} else if (existing.ratesHash !== newHash) {
			// Rates have changed
			lastUpdatedAt = now;
			hashChanged = true;
			console.log("Rates have CHANGED since last scrape");
			console.log(`  Old hash: ${existing.ratesHash}`);
			console.log(`  New hash: ${newHash}`);
		} else {
			// Rates unchanged, keep the old timestamp
			lastUpdatedAt = existing.lastUpdatedAt;
			console.log("Rates UNCHANGED since last scrape");
			console.log(`  Hash: ${newHash}`);
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
			`Last updated at: ${ratesFile.lastUpdatedAt}${hashChanged ? " (UPDATED)" : ""}`,
		);
		console.log(`Rates hash: ${ratesFile.ratesHash}`);
		console.log(`Output written to: ${outputPath}`);
	} catch (error) {
		console.error("Failed to scrape rates:", error);
		process.exit(1);
	}
}

main();
