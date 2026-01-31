/**
 * Breakeven point analysis for cashback comparison.
 *
 * Tests when different options become cheaper.
 */

import { describe, expect, it } from "vitest";
import {
    type CashbackBreakevenInputs,
    calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback breakeven point analysis", () => {
    it("identifies when high cashback becomes cheaper", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 350000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "High Cashback",
                    rate: 4.1,
                    cashbackType: "percentage",
                    cashbackValue: 2.5, // €8,750
                    fixedPeriodYears: 5,
                },
                {
                    label: "Low Rate",
                    rate: 3.5,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 5,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Find the breakeven between these options
        const breakeven = result.breakevens.find(
            (b) => b.optionAIndex === 0 && b.optionBIndex === 1,
        );

        expect(breakeven).toBeDefined();
        // Description should explain the crossover
        expect(breakeven?.description).toContain("High Cashback");
        expect(breakeven?.description).toContain("Low Rate");
    });

    it("returns null breakeven when one option is always better", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "Clearly Better",
                    rate: 3.5,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    fixedPeriodYears: 3,
                },
                {
                    label: "Clearly Worse",
                    rate: 4.0,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        const breakeven = result.breakevens[0];

        // Option A (lower rate + cashback) is always better
        // Breakeven month should be null
        expect(breakeven.breakevenMonth).toBeNull();
        expect(breakeven.description).toContain("always");
    });
});
