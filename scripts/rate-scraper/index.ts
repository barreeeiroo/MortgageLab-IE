#!/usr/bin/env bun

import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { aibProvider } from "./providers/aib";
import { boiProvider } from "./providers/boi";
import type { LenderProvider } from "./types";

const providers: Record<string, LenderProvider> = {
	aib: aibProvider,
	boi: boiProvider,
};

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
		const rates = await provider.scrape();

		const outputPath = join(
			import.meta.dir,
			"../../data/rates",
			`${lenderId}.json`,
		);

		await writeFile(outputPath, JSON.stringify(rates, null, "\t"));

		console.log(`\nSuccessfully scraped ${rates.length} rates`);
		console.log(`Output written to: ${outputPath}`);
	} catch (error) {
		console.error("Failed to scrape rates:", error);
		process.exit(1);
	}
}

main();
