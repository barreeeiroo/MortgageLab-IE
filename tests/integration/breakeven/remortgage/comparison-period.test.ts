/**
 * Comparison period analysis for remortgage.
 *
 * Tests different comparison period configurations.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRemortgageBreakeven,
    type RemortgageInputs,
} from "@/lib/mortgage/breakeven";

describe("Remortgage comparison period analysis", () => {
    it("uses full remaining term by default", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 250000,
            currentRate: 4.0,
            newRate: 3.5,
            remainingTermMonths: 180, // 15 years
        };

        const result = calculateRemortgageBreakeven(inputs);

        expect(result.comparisonPeriodMonths).toBe(180);
        expect(result.yearlyBreakdown).toHaveLength(15);
    });

    it("respects custom comparison period", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 250000,
            currentRate: 4.0,
            newRate: 3.5,
            remainingTermMonths: 180,
            comparisonPeriodMonths: 60, // Compare over 5 years only
        };

        const result = calculateRemortgageBreakeven(inputs);

        expect(result.comparisonPeriodMonths).toBe(60);

        // Interest savings calculated only over 5 years
        const fullTermResult = calculateRemortgageBreakeven({
            ...inputs,
            comparisonPeriodMonths: undefined,
        });

        expect(result.interestSavingsDetails.interestSaved).toBeLessThan(
            fullTermResult.interestSavingsDetails.interestSaved,
        );
    });

    it("caps comparison period at remaining term", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 250000,
            currentRate: 4.0,
            newRate: 3.5,
            remainingTermMonths: 60, // 5 years
            comparisonPeriodMonths: 120, // Request 10 years
        };

        const result = calculateRemortgageBreakeven(inputs);

        // Capped at remaining term
        expect(result.comparisonPeriodMonths).toBe(60);
    });
});
