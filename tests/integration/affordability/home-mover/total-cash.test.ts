/**
 * Total cash required calculations for Home Mover.
 *
 * Tests deposit + stamp duty + legal fees with equity.
 */

import { describe, expect, it } from "vitest";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import {
    calculateRequiredDeposit,
    EQUITY_SCENARIOS,
    LTV_LIMITS,
    PROPERTY_VALUES,
} from "../fixtures";

describe("Home Mover total cash required", () => {
    const MOVER_LTV = LTV_LIMITS.MOVER; // 90%

    it("calculates all costs for trade-up purchase", () => {
        const targetProperty = PROPERTY_VALUES.dublin; // €500k
        const { equity } = EQUITY_SCENARIOS.goodEquity;

        const requiredDeposit = calculateRequiredDeposit(
            targetProperty,
            MOVER_LTV,
        );
        const stampDuty = calculateStampDuty(targetProperty);
        const legalFees = ESTIMATED_LEGAL_FEES;

        expect(stampDuty).toBe(5000); // 1% of €500k
        expect(requiredDeposit).toBeCloseTo(50000, 0);

        // If using equity as deposit
        const cashFromEquityAfterDeposit = equity - requiredDeposit;
        const additionalCashNeeded = Math.max(
            0,
            stampDuty + legalFees - cashFromEquityAfterDeposit,
        );

        expect(cashFromEquityAfterDeposit).toBeCloseTo(250000, 0);
        expect(additionalCashNeeded).toBe(0); // Equity covers all costs
    });

    it("calculates costs when equity is tight", () => {
        const targetProperty = PROPERTY_VALUES.average; // €400k
        const { equity } = EQUITY_SCENARIOS.lowEquity; // €50k

        const requiredDeposit = calculateRequiredDeposit(
            targetProperty,
            MOVER_LTV,
        );
        const stampDuty = calculateStampDuty(targetProperty);
        const legalFees = ESTIMATED_LEGAL_FEES;

        const totalCostsNeeded = requiredDeposit + stampDuty + legalFees;
        const shortfall = totalCostsNeeded - equity;

        expect(requiredDeposit).toBeCloseTo(40000, 0);
        expect(stampDuty).toBe(4000);
        expect(totalCostsNeeded).toBeCloseTo(48000, 0);
        expect(shortfall).toBeCloseTo(-2000, 0); // Just enough equity
    });
});
