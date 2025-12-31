#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { MortgageRate, RatesFile } from "../../src/lib/schemas/rate";

const RATES_DIR = join(import.meta.dir, "../../data/rates");

interface DuplicateIdError {
	lenderId: string;
	type: "duplicate-id";
	message: string;
	duplicateId: string;
	occurrences: number;
}

interface BtlLtvError {
	lenderId: string;
	type: "btl-ltv-exceeded";
	message: string;
	rateId: string;
	maxLtv: number;
}

interface MixedBuyerTypesError {
	lenderId: string;
	type: "mixed-buyer-types";
	message: string;
	rateId: string;
	buyerTypes: string[];
}

type ValidationError = DuplicateIdError | BtlLtvError | MixedBuyerTypesError;

interface ValidationResult {
	lenderId: string;
	totalRates: number;
	errors: ValidationError[];
	isValid: boolean;
}

async function validateLenderRates(
	lenderId: string,
	rates: MortgageRate[],
): Promise<ValidationResult> {
	const errors: ValidationError[] = [];

	// Check for duplicate IDs
	const idCounts = new Map<string, number>();
	for (const rate of rates) {
		idCounts.set(rate.id, (idCounts.get(rate.id) ?? 0) + 1);
	}

	for (const [id, count] of idCounts) {
		if (count > 1) {
			errors.push({
				lenderId,
				type: "duplicate-id",
				message: `Duplicate ID found: "${id}" appears ${count} times`,
				duplicateId: id,
				occurrences: count,
			});
		}
	}

	// Check for mixed BTL and non-BTL buyer types
	const btlBuyerTypes = ["btl", "switcher-btl"];
	for (const rate of rates) {
		const hasBtl = rate.buyerTypes.some((bt) => btlBuyerTypes.includes(bt));
		const hasNonBtl = rate.buyerTypes.some((bt) => !btlBuyerTypes.includes(bt));
		if (hasBtl && hasNonBtl) {
			errors.push({
				lenderId,
				type: "mixed-buyer-types",
				message: `Rate "${rate.id}" mixes BTL and non-BTL buyer types: [${rate.buyerTypes.join(", ")}]`,
				rateId: rate.id,
				buyerTypes: [...rate.buyerTypes],
			});
		}
	}

	// Check BTL rates don't exceed 70% LTV
	const BTL_MAX_LTV = 70;
	for (const rate of rates) {
		const isBtlOnly = rate.buyerTypes.every((bt) => btlBuyerTypes.includes(bt));
		if (isBtlOnly && rate.maxLtv > BTL_MAX_LTV) {
			errors.push({
				lenderId,
				type: "btl-ltv-exceeded",
				message: `BTL rate "${rate.id}" has maxLtv ${rate.maxLtv}%, but BTL maximum is ${BTL_MAX_LTV}%`,
				rateId: rate.id,
				maxLtv: rate.maxLtv,
			});
		}
	}

	return {
		lenderId,
		totalRates: rates.length,
		errors,
		isValid: errors.length === 0,
	};
}

async function main() {
	console.log("Validating rate files...\n");

	const files = await readdir(RATES_DIR);
	const jsonFiles = files.filter((f) => f.endsWith(".json"));

	const results: ValidationResult[] = [];
	let hasErrors = false;

	for (const file of jsonFiles) {
		const lenderId = file.replace(".json", "");
		const filePath = join(RATES_DIR, file);

		try {
			const content = await readFile(filePath, "utf-8");
			const parsed = JSON.parse(content);

			// Handle both old format (array) and new format (object with rates)
			const rates: MortgageRate[] = Array.isArray(parsed)
				? parsed
				: (parsed as RatesFile).rates;

			const result = await validateLenderRates(lenderId, rates);
			results.push(result);

			if (!result.isValid) {
				hasErrors = true;
			}
		} catch (error) {
			console.error(`Failed to read/parse ${file}:`, error);
			hasErrors = true;
		}
	}

	// Print results
	console.log("=".repeat(60));
	console.log("VALIDATION RESULTS");
	console.log("=".repeat(60));

	for (const result of results) {
		const status = result.isValid ? "✓" : "✗";
		console.log(`\n${status} ${result.lenderId.toUpperCase()}`);
		console.log(`  Total rates: ${result.totalRates}`);

		if (result.errors.length > 0) {
			console.log(`  Errors (${result.errors.length}):`);
			for (const error of result.errors) {
				console.log(`    - ${error.message}`);
			}
		}
	}

	console.log(`\n${"=".repeat(60)}`);

	const validCount = results.filter((r) => r.isValid).length;
	const totalCount = results.length;

	if (hasErrors) {
		console.log(
			`FAILED: ${validCount}/${totalCount} lenders passed validation`,
		);
		process.exit(1);
	} else {
		console.log(`PASSED: All ${totalCount} lenders passed validation`);
	}
}

main();
