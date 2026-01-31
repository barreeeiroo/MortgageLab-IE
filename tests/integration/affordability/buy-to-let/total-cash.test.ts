/**
 * Total cash required calculations for Buy to Let.
 *
 * Tests higher deposit requirement impact.
 */

import { describe, expect, it } from "vitest";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import {
    calculateRequiredDeposit,
    LTV_LIMITS,
    PROPERTY_VALUES,
} from "../fixtures";

describe("BTL total cash required", () => {
    const BTL_LTV = LTV_LIMITS.BTL; // 70%

    it("calculates high deposit requirement for BTL", () => {
        const propertyValue = PROPERTY_VALUES.average; // €400k

        const deposit = calculateRequiredDeposit(propertyValue, BTL_LTV);
        const stampDuty = calculateStampDuty(propertyValue);
        const legalFees = ESTIMATED_LEGAL_FEES;

        expect(deposit).toBeCloseTo(120000, 0); // 30%
        expect(stampDuty).toBe(4000);
        expect(legalFees).toBe(4000);

        const totalCashRequired = deposit + stampDuty + legalFees;
        expect(totalCashRequired).toBeCloseTo(128000, 0);
    });

    it("compares BTL vs residential cash requirements", () => {
        const propertyValue = PROPERTY_VALUES.average; // €400k

        const btlDeposit = calculateRequiredDeposit(propertyValue, BTL_LTV);
        const ftbDeposit = calculateRequiredDeposit(
            propertyValue,
            LTV_LIMITS.FTB,
        );
        const stampDuty = calculateStampDuty(propertyValue);
        const legalFees = ESTIMATED_LEGAL_FEES;

        const btlTotal = btlDeposit + stampDuty + legalFees;
        const ftbTotal = ftbDeposit + stampDuty + legalFees;

        expect(btlTotal).toBeCloseTo(128000, 0);
        expect(ftbTotal).toBeCloseTo(48000, 0);
        expect(btlTotal - ftbTotal).toBeCloseTo(80000, 0);
    });
});
