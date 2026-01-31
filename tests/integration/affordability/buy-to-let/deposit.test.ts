/**
 * Deposit requirement scenarios for Buy to Let.
 *
 * BTL rules (Central Bank of Ireland):
 * - LTV limit: 70% (30% minimum deposit)
 */

import { describe, expect, it } from "vitest";
import {
    calculateMaxMortgageByLTI,
    calculateMaxMortgageByLTV,
    calculateRequiredDeposit,
    INCOME_SCENARIOS,
    LTI_LIMITS,
    LTV_LIMITS,
    PROPERTY_VALUES,
} from "../fixtures";

describe("BTL deposit requirements", () => {
    const BTL_LTI = LTI_LIMITS.BTL; // 3.5x
    const BTL_LTV = LTV_LIMITS.BTL; // 70%

    it("requires 30% deposit (stricter than residential)", () => {
        const propertyValue = PROPERTY_VALUES.average; // €400k

        const btlDeposit = calculateRequiredDeposit(propertyValue, BTL_LTV);
        const residentialDeposit = calculateRequiredDeposit(
            propertyValue,
            LTV_LIMITS.FTB,
        );

        expect(btlDeposit).toBeCloseTo(120000, 0); // 30% of €400k
        expect(residentialDeposit).toBeCloseTo(40000, 0); // 10% of €400k
        expect(btlDeposit).toBeCloseTo(3 * residentialDeposit, 0);
    });

    it("calculates max mortgage at 70% LTV", () => {
        const propertyValue = PROPERTY_VALUES.dublin; // €500k

        const maxMortgage = calculateMaxMortgageByLTV(propertyValue, BTL_LTV);

        expect(maxMortgage).toBe(350000);
    });

    it("deposit often more constraining than income for BTL", () => {
        const { income1 } = INCOME_SCENARIOS.single120k;
        const totalIncome = income1; // €120k
        const savings = 100000; // Good savings
        const propertyValue = PROPERTY_VALUES.dublin; // €500k

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            BTL_LTI,
        );
        const requiredDeposit = calculateRequiredDeposit(
            propertyValue,
            BTL_LTV,
        );

        expect(maxMortgageByIncome).toBe(420000);
        expect(requiredDeposit).toBeCloseTo(150000, 0);
        expect(savings).toBeLessThan(requiredDeposit);
        // With €100k deposit at 30% requirement, max property = €333k, max mortgage = €233k
        const maxPropertyBySavings = savings / (1 - BTL_LTV / 100);
        expect(maxPropertyBySavings).toBeCloseTo(333333, 0);
    });
});
