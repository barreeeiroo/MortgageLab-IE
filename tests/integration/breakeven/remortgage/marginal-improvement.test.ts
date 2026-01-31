/**
 * Marginal improvement scenarios for remortgage.
 *
 * Tests when small rate drops may not be worth switching.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRemortgageBreakeven,
    type RemortgageInputs,
} from "@/lib/mortgage/breakeven";
import { REMORTGAGE_SCENARIOS } from "../fixtures";

describe("Remortgage marginal improvement scenarios", () => {
    it("small rate improvement may not be worth switching", () => {
        const scenario = REMORTGAGE_SCENARIOS.marginalImprovement;
        const inputs: RemortgageInputs = {
            ...scenario,
        };

        const result = calculateRemortgageBreakeven(inputs);

        // 0.2% drop on €200k = modest savings
        expect(result.monthlySavings).toBeLessThan(50);

        // Takes longer to break even
        expect(result.breakevenMonths).toBeGreaterThan(24);

        // Net benefit may be relatively small
        const netBenefit = result.interestSavingsDetails.netBenefit;
        expect(netBenefit).toBeLessThan(5000);
    });

    it("larger rate drops lead to faster breakeven", () => {
        const baseInputs: RemortgageInputs = {
            outstandingBalance: 300000,
            currentRate: 4.0,
            newRate: 4.0, // Same rate initially
            remainingTermMonths: 240,
        };

        // Test different rate drops and verify larger drops = faster breakeven
        const drops = [0.2, 0.5, 1.0];
        const results = drops.map((drop) =>
            calculateRemortgageBreakeven({
                ...baseInputs,
                newRate: baseInputs.currentRate - drop,
            }),
        );

        // Larger rate drop should mean faster breakeven
        expect(results[1].breakevenMonths).toBeLessThan(
            results[0].breakevenMonths,
        );
        expect(results[2].breakevenMonths).toBeLessThan(
            results[1].breakevenMonths,
        );

        // A 1% drop on €300k should break even quickly
        expect(results[2].breakevenMonths).toBeLessThan(12);
    });
});
