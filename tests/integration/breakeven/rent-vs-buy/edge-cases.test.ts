/**
 * Edge cases and special scenarios for Rent vs Buy breakeven.
 *
 * Tests new builds, service charges, and extreme rent scenarios.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRentVsBuyBreakeven,
    type RentVsBuyInputs,
} from "@/lib/mortgage/breakeven";
import { DUBLIN_SCENARIOS } from "../fixtures";

describe("Rent vs Buy edge cases and special scenarios", () => {
    it("handles new build with VAT included", () => {
        const inputs: RentVsBuyInputs = {
            propertyValue: 400000,
            deposit: 40000,
            mortgageTermMonths: 360,
            mortgageRate: 3.5,
            currentMonthlyRent: 2000,
            propertyType: "new-build",
            priceIncludesVAT: true,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // Stamp duty calculated on VAT-exclusive price
        // €400k / 1.135 ≈ €352,423 net
        expect(result.stampDuty).toBeCloseTo(3524, 0);
    });

    it("handles apartment with service charge", () => {
        const { propertyValue, monthlyRent, deposit } =
            DUBLIN_SCENARIOS.cityCenter1Bed;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 360,
            mortgageRate: 3.5,
            currentMonthlyRent: monthlyRent,
            serviceCharge: 250, // €250/month service charge
            serviceChargeIncrease: 2, // 2% annual increase
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // Service charge adds to ownership costs
        // Should delay breakeven compared to no service charge
        expect(result.breakevenMonth).not.toBeNull();

        const withoutServiceCharge = calculateRentVsBuyBreakeven({
            ...inputs,
            serviceCharge: 0,
        });

        if (result.breakevenMonth && withoutServiceCharge.breakevenMonth) {
            expect(result.breakevenMonth).toBeGreaterThan(
                withoutServiceCharge.breakevenMonth,
            );
        }
    });

    it("handles very low rent scenario (renting favored)", () => {
        const inputs: RentVsBuyInputs = {
            propertyValue: 400000,
            deposit: 40000,
            mortgageTermMonths: 360,
            mortgageRate: 4.0,
            currentMonthlyRent: 800, // Very low rent (e.g., living with family)
            homeAppreciationRate: 2,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // With only €800 rent, buying may never make financial sense
        // or take a very long time to break even
        if (result.breakevenMonth) {
            expect(result.breakevenMonth).toBeGreaterThan(240); // > 20 years
        }
    });

    it("handles very high rent scenario (buying strongly favored)", () => {
        const inputs: RentVsBuyInputs = {
            propertyValue: 400000,
            deposit: 40000,
            mortgageTermMonths: 360,
            mortgageRate: 3.5,
            currentMonthlyRent: 3500, // Very high rent
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // With €3,500 rent vs ~€1,600 mortgage, buying wins quickly
        expect(result.breakevenMonth).not.toBeNull();
        if (result.breakevenMonth) {
            expect(result.breakevenMonth).toBeLessThan(60); // < 5 years
        }
    });
});
