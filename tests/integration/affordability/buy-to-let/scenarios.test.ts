/**
 * Realistic scenarios for Buy to Let.
 *
 * End-to-end tests with portfolio building scenarios.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import {
    calculateMaxMortgageByLTI,
    calculateRentalYield,
    calculateRequiredDeposit,
    INCOME_SCENARIOS,
    LTI_LIMITS,
    LTV_LIMITS,
    RENTAL_SCENARIOS,
} from "../fixtures";

describe("BTL realistic scenarios", () => {
    const BTL_LTI = LTI_LIMITS.BTL; // 3.5x
    const BTL_LTV = LTV_LIMITS.BTL; // 70%

    it("professional building BTL portfolio - first property", () => {
        const totalIncome = 100000;
        const savings = 150000;
        const { monthlyRent } = RENTAL_SCENARIOS.dublinSuburbs;
        const targetProperty = 400000;

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            BTL_LTI,
        );
        const requiredDeposit = calculateRequiredDeposit(
            targetProperty,
            BTL_LTV,
        );
        const mortgageNeeded = targetProperty - requiredDeposit;

        expect(maxMortgageByIncome).toBe(350000);
        expect(requiredDeposit).toBeCloseTo(120000, 0);
        expect(mortgageNeeded).toBeCloseTo(280000, 0);
        expect(savings).toBeGreaterThan(requiredDeposit);

        const metrics = calculateMortgageMetrics(
            mortgageNeeded,
            targetProperty,
            totalIncome,
        );
        expect(metrics.ltv).toBeCloseTo(70, 0);
        expect(metrics.lti).toBeCloseTo(2.8, 1);

        // Cash flow check
        const interestRate = 4.5;
        const monthlyInterest = (mortgageNeeded * (interestRate / 100)) / 12;
        expect(monthlyRent).toBeGreaterThan(monthlyInterest);
    });

    it("couple diversifying into property investment", () => {
        const { income1, income2 } = INCOME_SCENARIOS.joint130k;
        const totalIncome = income1 + income2;
        const savings = 200000;
        const { monthlyRent, propertyValue: targetProperty } =
            RENTAL_SCENARIOS.dublinCity;

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            BTL_LTI,
        );
        const requiredDeposit = calculateRequiredDeposit(
            targetProperty,
            BTL_LTV,
        );
        const mortgageNeeded = targetProperty - requiredDeposit;

        expect(maxMortgageByIncome).toBe(455000);
        expect(requiredDeposit).toBeCloseTo(150000, 0);
        expect(mortgageNeeded).toBeCloseTo(350000, 0);
        expect(savings).toBeGreaterThan(requiredDeposit);

        const yield_ = calculateRentalYield(monthlyRent * 12, targetProperty);
        expect(yield_).toBe(6);

        const metrics = calculateMortgageMetrics(
            mortgageNeeded,
            targetProperty,
            totalIncome,
        );
        expect(metrics.ltv).toBeCloseTo(70, 0);
        expect(metrics.lti).toBeCloseTo(2.69, 1);
    });

    it("experienced investor with equity from existing BTL", () => {
        const totalIncome = 80000;
        const existingBTLEquity = 100000; // Equity in existing BTL property
        const additionalSavings = 80000;
        const totalAvailable = existingBTLEquity + additionalSavings;
        const { monthlyRent, propertyValue: targetProperty } =
            RENTAL_SCENARIOS.regionalCity;

        const requiredDeposit = calculateRequiredDeposit(
            targetProperty,
            BTL_LTV,
        );
        const mortgageNeeded = targetProperty - requiredDeposit;

        expect(requiredDeposit).toBeCloseTo(90000, 0);
        expect(totalAvailable).toBeGreaterThan(requiredDeposit);
        expect(mortgageNeeded).toBeCloseTo(210000, 0);

        const metrics = calculateMortgageMetrics(
            mortgageNeeded,
            targetProperty,
            totalIncome,
        );
        expect(metrics.ltv).toBeCloseTo(70, 0);
        expect(metrics.lti).toBeCloseTo(2.625, 2);

        const yield_ = calculateRentalYield(monthlyRent * 12, targetProperty);
        expect(yield_).toBe(6);
    });
});
