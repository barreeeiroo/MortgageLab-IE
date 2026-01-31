/**
 * Timeline and breakdown analysis for remortgage.
 *
 * Tests tracking of savings and balances over time.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRemortgageBreakeven,
    type RemortgageInputs,
} from "@/lib/mortgage/breakeven";

describe("Remortgage timeline and breakdown analysis", () => {
    it("tracks cumulative savings correctly", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 300000,
            currentRate: 4.5,
            newRate: 3.5,
            remainingTermMonths: 240,
        };

        const result = calculateRemortgageBreakeven(inputs);

        // Monthly breakdown shows accumulating savings
        const month6 = result.monthlyBreakdown[5];
        const month12 = result.monthlyBreakdown[11];

        expect(month12.cumulativeSavings).toBeCloseTo(
            month6.cumulativeSavings * 2,
            -2,
        );

        // Net savings accounts for switching costs
        expect(month12.netSavings).toBe(
            month12.cumulativeSavings - result.switchingCosts,
        );
    });

    it("tracks balance reduction on both paths", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 300000,
            currentRate: 4.0,
            newRate: 3.5,
            remainingTermMonths: 240,
        };

        const result = calculateRemortgageBreakeven(inputs);

        // Both paths should show reducing balances
        const year5 = result.yearlyBreakdown[4];
        const year10 = result.yearlyBreakdown[9];

        expect(year10.remainingBalanceCurrent).toBeLessThan(
            year5.remainingBalanceCurrent,
        );
        expect(year10.remainingBalanceNew).toBeLessThan(
            year5.remainingBalanceNew,
        );

        // New rate path pays down balance faster (lower interest = more principal)
        // Actually, same payment amount, so principal repayment is slightly higher
    });

    it("interest saved grows over time", () => {
        const inputs: RemortgageInputs = {
            outstandingBalance: 350000,
            currentRate: 4.2,
            newRate: 3.5,
            remainingTermMonths: 300,
        };

        const result = calculateRemortgageBreakeven(inputs);

        const year5 = result.yearlyBreakdown[4];
        const year15 = result.yearlyBreakdown[14];

        expect(year15.interestSaved).toBeGreaterThan(year5.interestSaved);
    });
});
