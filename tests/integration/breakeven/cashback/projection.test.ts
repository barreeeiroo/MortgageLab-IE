/**
 * Projection year analysis for cashback breakeven.
 *
 * Tests projection beyond comparison period.
 */

import { describe, expect, it } from "vitest";
import {
    type CashbackBreakevenInputs,
    calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback projection year analysis", () => {
    it("provides projection when comparison period < term", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 300, // 25 years
            options: [
                {
                    label: "3yr Fixed",
                    rate: 3.8,
                    cashbackType: "percentage",
                    cashbackValue: 1.5,
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Comparison is 3 years, term is 25 years
        // Should have projection for year 4
        expect(result.projectionYear).not.toBeNull();
        expect(result.projectionYear?.year).toBe(4);
    });

    it("no projection when comparison equals term", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 60, // 5 years
            options: [
                {
                    label: "5yr Fixed",
                    rate: 3.8,
                    cashbackType: "percentage",
                    cashbackValue: 1.5,
                    fixedPeriodYears: 5,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Comparison period = term, no room for projection
        expect(result.projectionYear).toBeNull();
    });

    it("no projection for variable rates (full term comparison)", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "Variable",
                    rate: 3.8,
                    cashbackType: "flat",
                    cashbackValue: 2000,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        expect(result.allVariable).toBe(true);
        expect(result.projectionYear).toBeNull();
    });
});
