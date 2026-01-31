/**
 * Breakeven milestone analysis for Rent vs Buy.
 *
 * Tests the three breakeven metrics tracking.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRentVsBuyBreakeven,
    type RentVsBuyInputs,
} from "@/lib/mortgage/breakeven";
import { DUBLIN_SCENARIOS, RATE_SCENARIOS } from "../fixtures";

describe("Rent vs Buy breakeven milestone analysis", () => {
    it("tracks all three breakeven metrics", () => {
        const { propertyValue, monthlyRent, deposit } =
            DUBLIN_SCENARIOS.suburban2Bed;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 360,
            mortgageRate: RATE_SCENARIOS.mid.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // All three metrics should be tracked
        // 1. Net worth breakeven
        if (result.breakevenMonth) {
            expect(result.breakevenDetails).not.toBeNull();
            expect(result.breakevenDetails?.equity).toBeGreaterThan(0);
        }

        // 2. Break even on sale (sale proceeds > upfront costs)
        if (result.breakEvenOnSaleMonth) {
            expect(result.breakEvenOnSaleDetails).not.toBeNull();
            expect(result.breakEvenOnSaleDetails?.saleProceeds).toBeGreaterThan(
                result.breakEvenOnSaleDetails?.upfrontCosts ?? 0,
            );
        }

        // 3. Equity recovery (equity > upfront costs)
        if (result.equityRecoveryMonth) {
            expect(result.equityRecoveryDetails).not.toBeNull();
            expect(result.equityRecoveryDetails?.equity).toBeGreaterThan(
                result.equityRecoveryDetails?.upfrontCosts ?? 0,
            );
        }
    });

    it("equity recovery typically comes before net worth breakeven", () => {
        const { propertyValue, monthlyRent, deposit } =
            DUBLIN_SCENARIOS.suburban3Bed;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 360,
            mortgageRate: RATE_SCENARIOS.mid.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        if (result.equityRecoveryMonth && result.breakevenMonth) {
            // Equity recovery (simple equity > costs) usually happens before
            // full net worth breakeven (accounting for opportunity costs)
            expect(result.equityRecoveryMonth).toBeLessThanOrEqual(
                result.breakevenMonth,
            );
        }
    });
});
