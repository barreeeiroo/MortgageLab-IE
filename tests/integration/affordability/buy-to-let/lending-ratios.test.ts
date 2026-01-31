/**
 * Lending ratio calculations for Buy to Let.
 *
 * Tests LTV calculation accuracy.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import {
    calculateMaxMortgageByLTV,
    LTV_LIMITS,
    PROPERTY_VALUES,
} from "../fixtures";

describe("BTL lending ratio calculations", () => {
    const BTL_LTV = LTV_LIMITS.BTL; // 70%

    it("calculates LTV at exactly 70% for max borrowing", () => {
        const propertyValue = PROPERTY_VALUES.average;
        const mortgageAmount = calculateMaxMortgageByLTV(
            propertyValue,
            BTL_LTV,
        );
        const totalIncome = 100000;

        const metrics = calculateMortgageMetrics(
            mortgageAmount,
            propertyValue,
            totalIncome,
        );

        expect(metrics.ltv).toBe(70);
    });

    it("allows lower LTV when desired", () => {
        const propertyValue = PROPERTY_VALUES.average; // €400k
        const deposit = 160000; // 40% deposit
        const mortgageAmount = propertyValue - deposit;
        const totalIncome = 100000;

        const metrics = calculateMortgageMetrics(
            mortgageAmount,
            propertyValue,
            totalIncome,
        );

        expect(metrics.ltv).toBe(60);
        expect(metrics.ltv).toBeLessThan(BTL_LTV);
    });
});
