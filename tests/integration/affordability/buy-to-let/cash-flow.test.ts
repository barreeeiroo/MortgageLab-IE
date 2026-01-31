/**
 * Cash flow analysis for Buy to Let.
 *
 * Tests monthly cash flow and returns.
 */

import { describe, expect, it } from "vitest";
import {
    calculateMaxMortgageByLTV,
    calculateRequiredDeposit,
    LTV_LIMITS,
    RENTAL_SCENARIOS,
} from "../fixtures";

describe("BTL cash flow analysis", () => {
    const BTL_LTV = LTV_LIMITS.BTL; // 70%

    it("calculates monthly cash flow", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.dublinSuburbs;
        const mortgageAmount = calculateMaxMortgageByLTV(
            propertyValue,
            BTL_LTV,
        );
        const interestRate = 4.5;

        // Interest-only payment (common for BTL)
        const monthlyInterest = (mortgageAmount * (interestRate / 100)) / 12;
        const cashFlow = monthlyRent - monthlyInterest;

        expect(monthlyInterest).toBe(1050);
        expect(cashFlow).toBe(950); // €2000 rent - €1050 interest
    });

    it("calculates cash-on-cash return", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.dublinSuburbs;
        const mortgageAmount = calculateMaxMortgageByLTV(
            propertyValue,
            BTL_LTV,
        );
        const deposit = calculateRequiredDeposit(propertyValue, BTL_LTV);
        const interestRate = 4.5;

        const monthlyInterest = (mortgageAmount * (interestRate / 100)) / 12;
        const annualCashFlow = (monthlyRent - monthlyInterest) * 12;
        const cashOnCashReturn = (annualCashFlow / deposit) * 100;

        expect(deposit).toBeCloseTo(120000, 0);
        expect(annualCashFlow).toBeCloseTo(11400, 0); // (2000 - 1050) * 12
        expect(cashOnCashReturn).toBeCloseTo(9.5, 0);
    });
});
