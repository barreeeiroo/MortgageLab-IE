/**
 * Breakdown data quality for cashback comparison.
 *
 * Tests monthly and yearly breakdown structures.
 */

import { describe, expect, it } from "vitest";
import {
    type CashbackBreakevenInputs,
    calculateCashbackBreakeven,
} from "@/lib/mortgage/breakeven";

describe("Cashback breakdown data quality", () => {
    it("monthly breakdown has correct length", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 350000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "Option A",
                    rate: 3.8,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    fixedPeriodYears: 4, // 48 months
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Monthly breakdown capped at 48 months or comparison period
        expect(result.monthlyBreakdown).toHaveLength(48);
    });

    it("yearly breakdown matches comparison period", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 300000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "5yr Fixed",
                    rate: 3.7,
                    cashbackType: "flat",
                    cashbackValue: 3000,
                    fixedPeriodYears: 5,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        expect(result.yearlyBreakdown).toHaveLength(5);
        expect(result.yearlyBreakdown[0].year).toBe(1);
        expect(result.yearlyBreakdown[4].year).toBe(5);
    });

    it("breakdown tracks all options consistently", () => {
        const inputs: CashbackBreakevenInputs = {
            mortgageAmount: 400000,
            mortgageTermMonths: 300,
            options: [
                {
                    label: "A",
                    rate: 3.8,
                    cashbackType: "percentage",
                    cashbackValue: 2,
                    fixedPeriodYears: 3,
                },
                {
                    label: "B",
                    rate: 3.5,
                    cashbackType: "flat",
                    cashbackValue: 0,
                    fixedPeriodYears: 3,
                },
                {
                    label: "C",
                    rate: 3.65,
                    cashbackType: "percentage",
                    cashbackValue: 1,
                    fixedPeriodYears: 3,
                },
            ],
        };

        const result = calculateCashbackBreakeven(inputs);

        // Each yearly entry has data for all 3 options
        for (const year of result.yearlyBreakdown) {
            expect(year.netCosts).toHaveLength(3);
            expect(year.adjustedBalances).toHaveLength(3);
            expect(year.interestPaid).toHaveLength(3);
            expect(year.principalPaid).toHaveLength(3);
            expect(year.balances).toHaveLength(3);
        }
    });
});
