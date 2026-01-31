/**
 * Basic comparison scenarios for cashback breakeven.
 *
 * Tests comparing different cashback vs rate options.
 */

import { describe, expect, it } from "vitest";
import {
    type CashbackBreakevenInputs,
    calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback basic comparison scenarios", () => {
    it("compares high cashback vs low rate", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 350000,
            mortgageTermMonths: 300, // 25 years
            options: [
                {
                    label: "AIB 2% Cashback",
                    rate: 4.0,
                    cashbackType: "percentage",
                    cashbackValue: 2, // €7,000 cashback
                    fixedPeriodYears: 3,
                },
                {
                    label: "Avant Best Rate",
                    rate: 3.5,
                    cashbackType: "flat",
                    cashbackValue: 0, // No cashback
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Comparison over fixed period (3 years)
        expect(result.comparisonPeriodMonths).toBe(36);
        expect(result.comparisonPeriodYears).toBe(3);

        // Both options calculated
        expect(result.options).toHaveLength(2);

        // Verify cashback amounts
        expect(result.options[0].cashbackAmount).toBe(7000);
        expect(result.options[1].cashbackAmount).toBe(0);

        // Higher rate = higher monthly payment
        expect(result.options[0].monthlyPayment).toBeGreaterThan(
            result.options[1].monthlyPayment,
        );

        // Over 3 years, determine which is cheaper overall
        const netCostDiff = Math.abs(
            result.options[0].netCost - result.options[1].netCost,
        );
        expect(netCostDiff).toBeGreaterThan(0);
    });

    it("compares multiple lender options", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 400000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "BOI 2% Cashback",
                    rate: 3.9,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    fixedPeriodYears: 5,
                },
                {
                    label: "PTSB 1% Cashback",
                    rate: 3.7,
                    cashbackType: "percentage",
                    cashbackValue: 1,
                    fixedPeriodYears: 5,
                },
                {
                    label: "Haven No Cashback",
                    rate: 3.45,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 5,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        expect(result.options).toHaveLength(3);
        expect(result.comparisonPeriodMonths).toBe(60); // 5 years

        // All pairwise breakevens calculated (3 choose 2 = 3)
        expect(result.breakevens).toHaveLength(3);

        // Verify ranking
        expect(result.cheapestMonthlyIndex).toBe(2); // Lowest rate = lowest payment
        expect(result.options[2].monthlyPaymentDiff).toBe(0);
    });

    it("identifies best option by adjusted balance", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "High Cashback",
                    rate: 4.2,
                    cashbackType: "percentage",
                    cashbackValue: 3, // €9,000
                    fixedPeriodYears: 3,
                },
                {
                    label: "Low Rate",
                    rate: 3.5,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Adjusted balance simulates applying cashback to principal
        // The better option will have lower adjusted balance
        const betterIndex = result.cheapestAdjustedBalanceIndex;
        const best = result.options[betterIndex];
        const other = result.options[1 - betterIndex];

        expect(best.adjustedBalance).toBeLessThan(other.adjustedBalance);
    });
});
