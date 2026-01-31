/**
 * Real-world lender comparison for cashback breakeven.
 *
 * Tests realistic lender rate/cashback combinations.
 */

import { describe, expect, it } from "vitest";
import {
    type CashbackBreakevenInputs,
    calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback real-world lender comparison", () => {
    it("AIB vs BOI vs Avant comparison", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 400000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "AIB 3yr Fixed",
                    rate: 3.85,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    cashbackCap: 10000,
                    fixedPeriodYears: 3,
                },
                {
                    label: "BOI 3yr Fixed",
                    rate: 3.9,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    fixedPeriodYears: 3,
                },
                {
                    label: "Avant 3yr Fixed",
                    rate: 3.45,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Validate all calculations completed
        expect(result.options).toHaveLength(3);
        expect(result.breakevens).toHaveLength(3);

        // All options should have calculated values
        for (const opt of result.options) {
            expect(opt.monthlyPayment).toBeGreaterThan(0);
            expect(opt.interestPaid).toBeGreaterThan(0);
            expect(opt.principalPaid).toBeGreaterThan(0);
        }

        // Savings comparison is meaningful
        expect(result.savingsVsWorst).toBeGreaterThan(0);
    });

    it("5-year fixed comparison across lenders", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 350000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "EBS 5yr",
                    rate: 3.7,
                    cashbackType: "percentage",
                    cashbackValue: 1,
                    fixedPeriodYears: 5,
                },
                {
                    label: "Haven 5yr",
                    rate: 3.55,
                    cashbackType: "flat",
                    cashbackValue: 1500,
                    fixedPeriodYears: 5,
                },
                {
                    label: "PTSB 5yr",
                    rate: 3.65,
                    cashbackType: "percentage",
                    cashbackValue: 1.5,
                    cashbackCap: 5000,
                    fixedPeriodYears: 5,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        expect(result.comparisonPeriodMonths).toBe(60);

        // Monthly payment differences
        for (const opt of result.options) {
            expect(opt.monthlyPaymentDiff).toBeGreaterThanOrEqual(0);
        }

        // One option should have 0 diff (cheapest monthly)
        const zeroCount = result.options.filter(
            (o) => o.monthlyPaymentDiff === 0,
        ).length;
        expect(zeroCount).toBe(1);
    });
});
