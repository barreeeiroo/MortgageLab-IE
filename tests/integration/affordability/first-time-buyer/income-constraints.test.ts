/**
 * Income-constrained scenarios for First Time Buyer.
 *
 * FTB rules (Central Bank of Ireland):
 * - LTI limit: 4x gross income
 */

import { describe, expect, it } from "vitest";
import {
    calculateMaxMortgageByLTI,
    INCOME_SCENARIOS,
    LTI_LIMITS,
    LTV_LIMITS,
} from "../fixtures";

describe("FTB income-constrained scenarios", () => {
    const FTB_LTI = LTI_LIMITS.FTB; // 4x
    const FTB_LTV = LTV_LIMITS.FTB; // 90%

    it("single earner €50k can borrow up to €200k", () => {
        const { income1 } = INCOME_SCENARIOS.single50k;
        const totalIncome = income1;

        const maxMortgage = calculateMaxMortgageByLTI(totalIncome, FTB_LTI);

        expect(maxMortgage).toBe(200000);

        // With 90% LTV, max property = mortgage / 0.9
        const maxProperty = maxMortgage / (FTB_LTV / 100);
        expect(maxProperty).toBeCloseTo(222222, 0);
    });

    it("joint earners €90k can borrow up to €360k", () => {
        const { income1, income2 } = INCOME_SCENARIOS.joint90k;
        const totalIncome = income1 + income2;

        const maxMortgage = calculateMaxMortgageByLTI(totalIncome, FTB_LTI);

        expect(maxMortgage).toBe(360000);

        // Affordable property at 90% LTV
        const maxProperty = maxMortgage / (FTB_LTV / 100);
        expect(maxProperty).toBe(400000);
    });

    it("high earner €120k can borrow up to €480k", () => {
        const { income1 } = INCOME_SCENARIOS.single120k;
        const totalIncome = income1;

        const maxMortgage = calculateMaxMortgageByLTI(totalIncome, FTB_LTI);

        expect(maxMortgage).toBe(480000);
    });
});
