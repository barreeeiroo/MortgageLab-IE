/**
 * Perk-related calculations for mortgage comparisons.
 *
 * Handles cashback parsing and calculation logic for perks like:
 * - Percentage-based cashback (e.g., 2% of mortgage amount)
 * - Flat cashback amounts (e.g., €5,000)
 * - Capped cashback (e.g., 2% up to €10,000)
 */

import type { CashbackConfig, Perk } from "@/lib/schemas/perk";

// Re-export CashbackConfig for consumers
export type { CashbackConfig } from "@/lib/schemas/perk";

// =============================================================================
// Cashback Lookup
// =============================================================================

/**
 * Get cashback configuration from a perk ID.
 * Returns null if perk is not found or has no cashback configuration.
 */
export function getCashbackConfig(
    perkId: string,
    perks: Perk[],
): CashbackConfig | null {
    const perk = perks.find((p) => p.id === perkId);
    return perk?.cashback ?? null;
}

// =============================================================================
// Cashback Calculation
// =============================================================================

/**
 * Calculate cashback amount based on mortgage amount and cashback configuration.
 *
 * @param mortgageAmount - The mortgage amount in euros
 * @param config - Cashback configuration (type, value, optional cap)
 * @returns The cashback amount in euros
 */
export function calculateCashbackAmount(
    mortgageAmount: number,
    config: CashbackConfig,
): number {
    let amount: number;

    if (config.type === "flat") {
        amount = config.value;
    } else {
        // Percentage-based
        amount = mortgageAmount * (config.value / 100);
    }

    // Apply cap if specified
    if (config.cap !== undefined && amount > config.cap) {
        amount = config.cap;
    }

    return amount;
}
