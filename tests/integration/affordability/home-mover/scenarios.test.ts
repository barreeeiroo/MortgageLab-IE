/**
 * Realistic scenarios for Home Mover.
 *
 * End-to-end tests with real-world scenarios.
 */

import { describe, expect, it } from "vitest";
import { calculateMortgageMetrics } from "@/lib/utils/borrowing";
import { calculateStampDuty, ESTIMATED_LEGAL_FEES } from "@/lib/utils/fees";
import { calculateMaxMortgageByLTI, LTI_LIMITS } from "../fixtures";

describe("Home Mover realistic scenarios", () => {
    const MOVER_LTI = LTI_LIMITS.MOVER; // 3.5x

    it("family trading up from starter to family home", () => {
        // Couple €100k combined, current property €350k with €100k mortgage
        const totalIncome = 100000;
        const currentPropertyValue = 350000;
        const currentMortgage = 100000;
        const equity = currentPropertyValue - currentMortgage;
        const targetProperty = 500000;

        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            MOVER_LTI,
        );
        const mortgageNeeded = targetProperty - equity;

        expect(equity).toBe(250000);
        expect(maxMortgageByIncome).toBe(350000);
        expect(mortgageNeeded).toBe(250000);
        expect(mortgageNeeded).toBeLessThan(maxMortgageByIncome);

        const metrics = calculateMortgageMetrics(
            mortgageNeeded,
            targetProperty,
            totalIncome,
        );
        expect(metrics.ltv).toBe(50);
        expect(metrics.lti).toBe(2.5);
    });

    it("empty nesters downsizing", () => {
        // Current property €500k fully paid
        const currentPropertyValue = 500000;
        const currentMortgage = 0;
        const equity = currentPropertyValue - currentMortgage;
        const targetProperty = 350000;

        const cashAfterPurchase = equity - targetProperty;
        const stampDuty = calculateStampDuty(targetProperty);
        const legalFees = ESTIMATED_LEGAL_FEES;

        expect(equity).toBe(500000);
        expect(cashAfterPurchase).toBe(150000);
        // Can buy outright and have €150k - costs left over
        const netCash = cashAfterPurchase - stampDuty - legalFees;
        expect(netCash).toBe(142500); // €150k - €3.5k - €4k
    });

    it("lateral move to different area", () => {
        // Couple €90k, selling €400k to buy €420k in different location
        const totalIncome = 90000;
        const currentPropertyValue = 400000;
        const currentMortgage = 150000;
        const equity = currentPropertyValue - currentMortgage;
        const targetProperty = 420000;

        const mortgageNeeded = targetProperty - equity;
        const maxMortgageByIncome = calculateMaxMortgageByLTI(
            totalIncome,
            MOVER_LTI,
        );

        expect(equity).toBe(250000);
        expect(mortgageNeeded).toBe(170000);
        expect(mortgageNeeded).toBeLessThan(maxMortgageByIncome);

        const metrics = calculateMortgageMetrics(
            mortgageNeeded,
            targetProperty,
            totalIncome,
        );
        expect(metrics.ltv).toBeCloseTo(40.48, 1);
        expect(metrics.lti).toBeCloseTo(1.89, 1);
    });
});
