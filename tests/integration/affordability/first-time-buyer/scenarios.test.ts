/**
 * Realistic scenarios for First Time Buyer.
 *
 * End-to-end tests with real-world Dublin market scenarios.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import {
    calculateMaxMortgageByLTI,
    calculateRequiredDeposit,
    LTI_LIMITS,
    LTV_LIMITS,
} from "../fixtures";

describe("FTB realistic scenarios", () => {
    const FTB_LTI = LTI_LIMITS.FTB; // 4x
    const FTB_LTV = LTV_LIMITS.FTB; // 90%

    it("young Dublin couple buying starter home", () => {
        // Couple in late 20s, combined income €90k, buying €400k apartment
        const totalIncome = 90000;
        const propertyValue = 400000;
        const deposit = 45000; // 11.25% deposit
        const mortgageAmount = propertyValue - deposit;

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            FTB_LTI,
        );
        const metrics = calculateMortgageMetrics(
            mortgageAmount,
            propertyValue,
            totalIncome,
        );
        const stampDuty = calculateStampDuty(propertyValue);
        const totalCash = deposit + stampDuty + ESTIMATED_LEGAL_FEES;

        expect(mortgageAmount).toBe(355000);
        expect(mortgageAmount).toBeLessThanOrEqual(maxMortgageByIncome);
        expect(metrics.ltv).toBeCloseTo(88.75, 1);
        expect(metrics.lti).toBeCloseTo(3.94, 1);
        expect(totalCash).toBe(53000); // 45k + 4k + 4k
    });

    it("single professional buying city apartment", () => {
        // Single earner €80k, buying €300k apartment
        const totalIncome = 80000;
        const propertyValue = 300000;
        const deposit = 30000; // 10% minimum
        const mortgageAmount = propertyValue - deposit;

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            FTB_LTI,
        );
        const metrics = calculateMortgageMetrics(
            mortgageAmount,
            propertyValue,
            totalIncome,
        );

        expect(maxMortgageByIncome).toBe(320000);
        expect(mortgageAmount).toBe(270000);
        expect(metrics.ltv).toBe(90);
        expect(metrics.lti).toBeCloseTo(3.375, 2);
    });

    it("high-income couple stretching to premium property", () => {
        // Combined income €130k, targeting €550k house
        const totalIncome = 130000;
        const propertyValue = 550000;
        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            FTB_LTI,
        );
        const requiredDeposit = propertyValue - maxMortgageByIncome;

        // At 4x LTI, max mortgage is €520k
        expect(maxMortgageByIncome).toBe(520000);
        // They need €30k deposit minimum to reach income limit
        expect(requiredDeposit).toBe(30000);
        // But 10% LTV requirement says €55k
        const ltvDeposit = calculateRequiredDeposit(propertyValue, FTB_LTV);
        expect(ltvDeposit).toBeCloseTo(55000, 0);

        // Actual mortgage with 10% deposit
        const actualMortgage = propertyValue - ltvDeposit;
        expect(actualMortgage).toBeCloseTo(495000, 0);

        const metrics = calculateMortgageMetrics(
            actualMortgage,
            propertyValue,
            totalIncome,
        );
        expect(metrics.lti).toBeCloseTo(3.81, 1);
    });
});
