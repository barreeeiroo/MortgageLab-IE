#!/usr/bin/env bun

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Lender } from "@/lib/schemas/lender";
import type { RatesFile } from "@/lib/schemas/rate";
import type { RatesHistoryFile } from "@/lib/schemas/rate-history";
import { reconstructRates } from "./history/changeset";
import { computeRatesHash } from "./utils/hash";

const RATES_DIR = join(import.meta.dir, "../../data/rates");
const HISTORY_DIR = join(import.meta.dir, "../../data/rates/history");
const LENDERS_FILE = join(import.meta.dir, "../../data/lenders.json");

interface ValidationResult {
    lenderId: string;
    success: boolean;
    error?: string;
    details?: string;
}

async function readHistoryFile(
    lenderId: string,
): Promise<RatesHistoryFile | null> {
    const filePath = join(HISTORY_DIR, `${lenderId}.json`);
    try {
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content) as RatesHistoryFile;
    } catch {
        return null;
    }
}

async function readRatesFile(lenderId: string): Promise<RatesFile | null> {
    const filePath = join(RATES_DIR, `${lenderId}.json`);
    try {
        const content = await readFile(filePath, "utf-8");
        return JSON.parse(content) as RatesFile;
    } catch {
        return null;
    }
}

async function validateLender(lender: Lender): Promise<ValidationResult> {
    const { id: lenderId, discontinued } = lender;

    const history = await readHistoryFile(lenderId);
    const ratesFile = await readRatesFile(lenderId);

    // Handle discontinued lenders
    if (discontinued) {
        if (ratesFile !== null) {
            return {
                lenderId,
                success: false,
                error: "Discontinued lender should not have a rates file",
                details: `Found rates file at data/rates/${lenderId}.json but lender is marked as discontinued`,
            };
        }
        if (history === null) {
            return {
                lenderId,
                success: true,
                details: "Discontinued lender with no history (OK)",
            };
        }
        return {
            lenderId,
            success: true,
            details: `Discontinued lender with ${history.changesets.length} changesets preserved`,
        };
    }

    // Active lender checks
    if (history === null) {
        if (ratesFile === null) {
            return {
                lenderId,
                success: true,
                details:
                    "No history or rates file (new lender, not yet scraped)",
            };
        }
        return {
            lenderId,
            success: false,
            error: "Rates file exists but no history file",
            details:
                "Run the scraper to create history. History should be created alongside rates.",
        };
    }

    if (ratesFile === null) {
        return {
            lenderId,
            success: false,
            error: "History file exists but no rates file",
            details: "Active lender must have a rates file",
        };
    }

    // Reconstruct rates from history and compare hash
    const reconstructedRates = reconstructRates(history);
    const reconstructedHash = computeRatesHash(reconstructedRates);

    if (reconstructedHash !== ratesFile.ratesHash) {
        return {
            lenderId,
            success: false,
            error: "Reconstructed hash does not match rates file hash",
            details: `Expected: ${ratesFile.ratesHash}\nGot: ${reconstructedHash}\nChangesets: ${history.changesets.length}`,
        };
    }

    return {
        lenderId,
        success: true,
        details: `Hash matches (${history.changesets.length} changesets)`,
    };
}

async function main() {
    console.log("Validating rate history files...\n");

    const lendersContent = await readFile(LENDERS_FILE, "utf-8");
    const lenders = JSON.parse(lendersContent) as Lender[];

    const results: ValidationResult[] = [];
    let hasErrors = false;

    for (const lender of lenders) {
        const result = await validateLender(lender);
        results.push(result);

        if (!result.success) {
            hasErrors = true;
        }
    }

    // Print results
    console.log("=".repeat(60));
    console.log("HISTORY VALIDATION RESULTS");
    console.log("=".repeat(60));

    for (const result of results) {
        const status = result.success ? "✓" : "✗";
        console.log(`\n${status} ${result.lenderId.toUpperCase()}`);

        if (result.details) {
            console.log(`  ${result.details}`);
        }

        if (result.error) {
            console.log(`  ERROR: ${result.error}`);
        }
    }

    console.log(`\n${"=".repeat(60)}`);

    const validCount = results.filter((r) => r.success).length;
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
