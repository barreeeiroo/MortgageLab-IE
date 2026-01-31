/**
 * Dublin market scenarios for Rent vs Buy breakeven.
 *
 * Tests realistic Dublin property and rental scenarios.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRentVsBuyBreakeven,
    type RentVsBuyInputs,
} from "@/lib/mortgage/breakeven";
import { DUBLIN_SCENARIOS, RATE_SCENARIOS } from "../fixtures";

describe("Rent vs Buy Dublin market scenarios", () => {
    it("city center apartment - high rent vs high price", () => {
        const { propertyValue, monthlyRent, deposit } =
            DUBLIN_SCENARIOS.cityCenter1Bed;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 360, // 30 years
            mortgageRate: RATE_SCENARIOS.current.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        // With €2000 rent vs €350k property, buying should break even
        expect(result.breakevenMonth).not.toBeNull();
        expect(result.monthlyMortgagePayment).toBeGreaterThan(0);
        expect(result.mortgageAmount).toBe(315000);

        // Verify upfront costs calculation
        expect(result.deposit).toBe(35000);
        expect(result.stampDuty).toBe(3500); // 1% of €350k
    });

    it("suburban 3-bed house - family purchase decision", () => {
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

        expect(result.mortgageAmount).toBe(450000);
        expect(result.stampDuty).toBe(5000);
        expect(result.upfrontCosts).toBe(59000); // 50k + 5k + 4k

        // Should break even eventually with reasonable appreciation
        expect(result.breakevenMonth).not.toBeNull();
    });

    it("premium South Dublin property - higher barrier", () => {
        const { propertyValue, monthlyRent, deposit } =
            DUBLIN_SCENARIOS.southDublinHouse;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 300, // 25 years
            mortgageRate: RATE_SCENARIOS.current.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        expect(result.mortgageAmount).toBe(585000);
        // Higher stamp duty due to higher price
        expect(result.stampDuty).toBe(6500);

        // Even with €3k rent, high upfront costs take time to recover
        expect(result.upfrontCosts).toBeGreaterThan(70000);
    });
});
