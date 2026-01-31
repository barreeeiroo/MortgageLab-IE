/**
 * Regional market scenarios for Rent vs Buy breakeven.
 *
 * Tests Cork, Galway, Limerick property scenarios.
 */

import { describe, expect, it } from "vitest";
import {
    calculateRentVsBuyBreakeven,
    type RentVsBuyInputs,
} from "@/lib/mortgage/breakeven";
import { RATE_SCENARIOS, REGIONAL_SCENARIOS } from "../fixtures";

describe("Rent vs Buy regional market scenarios", () => {
    it("Cork apartment - lower prices, lower rents", () => {
        const { propertyValue, monthlyRent, deposit } =
            REGIONAL_SCENARIOS.corkApartment;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 360,
            mortgageRate: RATE_SCENARIOS.mid.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        expect(result.mortgageAmount).toBe(270000);
        expect(result.upfrontCosts).toBe(37000); // 30k + 3k + 4k

        // Regional markets often have better price-to-rent ratios
        expect(result.breakevenMonth).not.toBeNull();
    });

    it("Limerick starter home - most affordable entry point", () => {
        const { propertyValue, monthlyRent, deposit } =
            REGIONAL_SCENARIOS.limerickStarter;
        const inputs: RentVsBuyInputs = {
            propertyValue,
            deposit,
            mortgageTermMonths: 300,
            mortgageRate: RATE_SCENARIOS.low.rate,
            currentMonthlyRent: monthlyRent,
        };

        const result = calculateRentVsBuyBreakeven(inputs);

        expect(result.mortgageAmount).toBe(225000);
        expect(result.stampDuty).toBe(2500);
        expect(result.upfrontCosts).toBe(31500);

        // Lower entry costs should mean faster breakeven
        expect(result.breakevenMonth).not.toBeNull();
        if (result.breakevenMonth) {
            expect(result.breakevenMonth).toBeLessThan(180); // Under 15 years
        }
    });
});
