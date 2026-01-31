import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { MortgageRate } from "@/lib/schemas/rate";
import type {
    RateDiffOperation,
    RatesHistoryFile,
} from "@/lib/schemas/rate-history";

const HISTORY_DIR = join(import.meta.dir, "../../../data/rates/history");

/**
 * Deep equality check for comparing rate field values.
 */
function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        // Sort arrays for comparison (handles buyerTypes, berEligible, perks)
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, i) => deepEqual(val, sortedB[i]));
    }

    if (typeof a === "object" && typeof b === "object") {
        const keysA = Object.keys(a as object);
        const keysB = Object.keys(b as object);
        if (keysA.length !== keysB.length) return false;
        return keysA.every((key) =>
            deepEqual(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key],
            ),
        );
    }

    return false;
}

/**
 * Computes the field-level changes between two rate objects.
 * Returns only the changed fields plus the id.
 */
function computeFieldChanges(
    oldRate: MortgageRate,
    newRate: MortgageRate,
): Partial<MortgageRate> & { id: string } {
    const changes: Partial<MortgageRate> & { id: string } = { id: newRate.id };

    const fields: (keyof MortgageRate)[] = [
        "name",
        "lenderId",
        "type",
        "rate",
        "apr",
        "fixedTerm",
        "minLtv",
        "maxLtv",
        "minLoan",
        "buyerTypes",
        "berEligible",
        "newBusiness",
        "perks",
        "warning",
    ];

    for (const field of fields) {
        if (!deepEqual(oldRate[field], newRate[field])) {
            (changes as Record<string, unknown>)[field] = newRate[field];
        }
    }

    return changes;
}

/**
 * Computes diff operations between old and new rate arrays.
 * Returns an array of add/remove/update operations.
 */
export function computeDiffOperations(
    oldRates: MortgageRate[],
    newRates: MortgageRate[],
): RateDiffOperation[] {
    const operations: RateDiffOperation[] = [];
    const oldById = new Map(oldRates.map((r) => [r.id, r]));
    const newById = new Map(newRates.map((r) => [r.id, r]));

    // Find added and updated rates
    for (const [id, newRate] of newById) {
        const oldRate = oldById.get(id);
        if (!oldRate) {
            operations.push({ op: "add", rate: newRate });
        } else {
            const changes = computeFieldChanges(oldRate, newRate);
            // >1 because id is always included
            if (Object.keys(changes).length > 1) {
                operations.push({ op: "update", id, changes });
            }
        }
    }

    // Find removed rates
    for (const id of oldById.keys()) {
        if (!newById.has(id)) {
            operations.push({ op: "remove", id });
        }
    }

    return operations;
}

/**
 * Reads existing history file for a lender.
 */
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

/**
 * Writes history file for a lender.
 */
async function writeHistoryFile(
    lenderId: string,
    history: RatesHistoryFile,
): Promise<void> {
    const filePath = join(HISTORY_DIR, `${lenderId}.json`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(history, null, "\t"));
}

/**
 * Appends a new changeset to lender history or creates baseline.
 * Called when ratesHash changes.
 *
 * @param lenderId - The lender ID
 * @param newRates - The new rates array
 * @param ratesHash - The computed hash of new rates
 * @param timestamp - ISO datetime of the change
 */
export async function appendChangeset(
    lenderId: string,
    newRates: MortgageRate[],
    ratesHash: string,
    timestamp: string,
): Promise<void> {
    const existing = await readHistoryFile(lenderId);

    if (!existing) {
        // First time: create baseline with empty changesets
        const history: RatesHistoryFile = {
            lenderId,
            baseline: {
                timestamp,
                ratesHash,
                rates: newRates,
            },
            changesets: [],
        };
        await writeHistoryFile(lenderId, history);
        console.log(`  History: Created baseline for ${lenderId}`);
        return;
    }

    // Get the current rates by applying all changesets to baseline
    const currentRates = reconstructRates(existing);
    const operations = computeDiffOperations(currentRates, newRates);

    if (operations.length === 0) {
        // This shouldn't happen if hash changed, but handle gracefully
        console.log(`  History: No operations to record for ${lenderId}`);
        return;
    }

    // Append new changeset
    existing.changesets.push({
        timestamp,
        afterHash: ratesHash,
        operations,
    });

    await writeHistoryFile(lenderId, existing);
    console.log(
        `  History: Appended changeset #${existing.changesets.length} for ${lenderId} (${operations.length} operations)`,
    );
}

/**
 * Ensures history file exists for a lender.
 * Creates baseline if history doesn't exist yet.
 * Called when rates are unchanged but we need to initialize history.
 *
 * @param lenderId - The lender ID
 * @param rates - The current rates array
 * @param ratesHash - The computed hash of rates
 * @param timestamp - ISO datetime to use for baseline
 * @returns true if baseline was created, false if history already existed
 */
export async function ensureHistoryExists(
    lenderId: string,
    rates: MortgageRate[],
    ratesHash: string,
    timestamp: string,
): Promise<boolean> {
    const existing = await readHistoryFile(lenderId);

    if (existing) {
        return false; // History already exists
    }

    // Create baseline with empty changesets
    const history: RatesHistoryFile = {
        lenderId,
        baseline: {
            timestamp,
            ratesHash,
            rates,
        },
        changesets: [],
    };
    await writeHistoryFile(lenderId, history);
    console.log(`  History: Created baseline for ${lenderId}`);
    return true;
}

/**
 * Reconstructs the current rates from baseline + all changesets.
 * Used internally and exported for validation.
 */
export function reconstructRates(history: RatesHistoryFile): MortgageRate[] {
    const rateMap = new Map<string, MortgageRate>(
        history.baseline.rates.map((r) => [r.id, { ...r }]),
    );

    for (const changeset of history.changesets) {
        for (const op of changeset.operations) {
            switch (op.op) {
                case "add":
                    rateMap.set(op.rate.id, op.rate);
                    break;
                case "remove":
                    rateMap.delete(op.id);
                    break;
                case "update": {
                    const existing = rateMap.get(op.id);
                    if (existing) {
                        rateMap.set(op.id, { ...existing, ...op.changes });
                    }
                    break;
                }
            }
        }
    }

    return Array.from(rateMap.values());
}
