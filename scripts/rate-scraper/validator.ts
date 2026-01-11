#!/usr/bin/env bun

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
	BTL_BUYER_TYPES,
	SWITCHER_BUYER_TYPES,
} from "../../src/lib/constants/buyer";
import { isValidFollowOnRate } from "../../src/lib/mortgage/rates";
import type { MortgageRate, RatesFile } from "../../src/lib/schemas/rate";

const RATES_DIR = join(import.meta.dir, "../../data/rates");
const LENDERS_FILE = join(import.meta.dir, "../../data/lenders.json");

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

interface FollowOnRateError {
	lenderId: string;
	type: "follow-on-rate";
	message: string;
	rateId: string;
	matchingVariableRates: string[];
}

interface ExistingCustomerBuyerTypeError {
	lenderId: string;
	type: "existing-customer-buyer-type";
	message: string;
	rateId: string;
	buyerTypes: string[];
}

interface FollowOnRateWarning {
	lenderId: string;
	type: "follow-on-rate-ltv-dependent";
	message: string;
	rateId: string;
	matchingVariableRates: string[];
}

type ValidationError =
	| DuplicateIdError
	| BtlLtvError
	| MixedBuyerTypesError
	| FollowOnRateError
	| ExistingCustomerBuyerTypeError;

type ValidationWarning = FollowOnRateWarning;

interface ValidationResult {
	lenderId: string;
	totalRates: number;
	errors: ValidationError[];
	warnings: ValidationWarning[];
	isValid: boolean;
}

async function validateLenderRates(
	lenderId: string,
	rates: MortgageRate[],
): Promise<ValidationResult> {
	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

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
	for (const rate of rates) {
		const hasBtl = rate.buyerTypes.some((bt) =>
			BTL_BUYER_TYPES.includes(bt as (typeof BTL_BUYER_TYPES)[number]),
		);
		const hasNonBtl = rate.buyerTypes.some(
			(bt) => !BTL_BUYER_TYPES.includes(bt as (typeof BTL_BUYER_TYPES)[number]),
		);
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
		const isBtlOnly = rate.buyerTypes.every((bt) =>
			BTL_BUYER_TYPES.includes(bt as (typeof BTL_BUYER_TYPES)[number]),
		);
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

	// Check existing customer rates (newBusiness: false) only have switcher buyer types
	for (const rate of rates) {
		if (rate.newBusiness === false) {
			const nonSwitcherTypes = rate.buyerTypes.filter(
				(bt) =>
					!SWITCHER_BUYER_TYPES.includes(
						bt as (typeof SWITCHER_BUYER_TYPES)[number],
					),
			);
			if (nonSwitcherTypes.length > 0) {
				errors.push({
					lenderId,
					type: "existing-customer-buyer-type",
					message: `Existing customer rate "${rate.id}" has non-switcher buyer types: [${nonSwitcherTypes.join(", ")}]`,
					rateId: rate.id,
					buyerTypes: [...rate.buyerTypes],
				});
			}
		}
	}

	// Check each fixed rate has exactly one corresponding variable rate for follow-on
	const fixedRates = rates.filter((r) => r.type === "fixed");
	const variableRates = rates.filter((r) => r.type === "variable");

	const arraysEqual = (a: string[], b: string[]) => {
		const sortedA = [...a].sort();
		const sortedB = [...b].sort();
		return (
			sortedA.length === sortedB.length &&
			sortedA.every((v, i) => v === sortedB[i])
		);
	};

	for (const fixedRate of fixedRates) {
		// Use shared validation logic, plus additional validator-specific checks
		const baseFilter = (varRate: MortgageRate) => {
			if (!isValidFollowOnRate(fixedRate, varRate)) {
				return false;
			}
			// Validator excludes new business rates (customers rolling off fixed get follow-on rates)
			if (varRate.newBusiness === true) {
				return false;
			}
			return true;
		};

		// First try to find variable rates with matching berEligible
		const fixedBer = fixedRate.berEligible ?? [];
		let matchingVariables = variableRates.filter((varRate) => {
			if (!baseFilter(varRate)) return false;
			const varBer = varRate.berEligible ?? [];
			return arraysEqual(fixedBer, varBer);
		});

		// If no exact berEligible match, fall back to variable rates without berEligible
		if (matchingVariables.length === 0) {
			matchingVariables = variableRates.filter((varRate) => {
				if (!baseFilter(varRate)) return false;
				return varRate.berEligible === undefined;
			});
		}

		// If we have follow-on rates (newBusiness: false), prioritize those
		const followOnRates = matchingVariables.filter(
			(r) => r.newBusiness === false,
		);
		const effectiveRates =
			followOnRates.length > 0 ? followOnRates : matchingVariables;

		const allSameRate =
			effectiveRates.length > 0 &&
			effectiveRates.every((v) => v.rate === effectiveRates[0].rate);

		if (matchingVariables.length === 0) {
			errors.push({
				lenderId,
				type: "follow-on-rate",
				message: `Fixed rate "${fixedRate.id}" has no matching variable rate for follow-on`,
				rateId: fixedRate.id,
				matchingVariableRates: [],
			});
		} else if (!allSameRate) {
			const matchIds = effectiveRates.map((r) => r.id);
			const hasOverlappingLtvBands = effectiveRates.some((v1, i) =>
				effectiveRates.some(
					(v2, j) => i < j && v1.minLtv < v2.maxLtv && v2.minLtv < v1.maxLtv,
				),
			);

			if (!hasOverlappingLtvBands) {
				warnings.push({
					lenderId,
					type: "follow-on-rate-ltv-dependent",
					message: `Fixed rate "${fixedRate.id}" has LTV-dependent follow-on rates: [${matchIds.join(", ")}]`,
					rateId: fixedRate.id,
					matchingVariableRates: matchIds,
				});
			} else {
				errors.push({
					lenderId,
					type: "follow-on-rate",
					message: `Fixed rate "${fixedRate.id}" has ${effectiveRates.length} matching variable rates with different rates: [${matchIds.join(", ")}]`,
					rateId: fixedRate.id,
					matchingVariableRates: matchIds,
				});
			}
		}
	}

	return {
		lenderId,
		totalRates: rates.length,
		errors,
		warnings,
		isValid: errors.length === 0,
	};
}

async function main() {
	console.log("Validating rate files...\n");

	const lendersContent = await readFile(LENDERS_FILE, "utf-8");
	const lenders = JSON.parse(lendersContent) as { id: string }[];
	const lenderIds = lenders.map((l) => l.id);

	const files = await readdir(RATES_DIR);
	const jsonFiles = files
		.filter((f) => f.endsWith(".json"))
		.sort((a, b) => {
			const aId = a.replace(".json", "");
			const bId = b.replace(".json", "");
			return lenderIds.indexOf(aId) - lenderIds.indexOf(bId);
		});

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
		const hasWarnings = result.warnings.length > 0;
		const status = result.isValid ? (hasWarnings ? "⚠" : "✓") : "✗";
		console.log(`\n${status} ${result.lenderId.toUpperCase()}`);
		console.log(`  Total rates: ${result.totalRates}`);

		if (result.errors.length > 0) {
			console.log(`  Errors (${result.errors.length}):`);
			for (const error of result.errors) {
				console.log(`    - ${error.message}`);
			}
		}

		if (result.warnings.length > 0) {
			console.log(`  Warnings (${result.warnings.length}):`);
			for (const warning of result.warnings) {
				console.log(`    - ${warning.message}`);
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
