/**
 * Rental yield calculations for Buy to Let.
 *
 * Tests gross rental yield across different markets.
 */

import { describe, expect, it } from "vitest";
import { calculateRentalYield, RENTAL_SCENARIOS } from "../fixtures";

describe("BTL rental yield calculations", () => {
    it("calculates rental yield correctly", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.dublinSuburbs;
        const annualRent = monthlyRent * 12;

        const yield_ = calculateRentalYield(annualRent, propertyValue);

        expect(yield_).toBe(6); // (2000 * 12) / 400000 * 100 = 6%
    });

    it("Dublin city has lower yield due to high prices", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.dublinCity;
        const annualRent = monthlyRent * 12;

        const yield_ = calculateRentalYield(annualRent, propertyValue);

        expect(yield_).toBe(6); // (2500 * 12) / 500000 * 100 = 6%
    });

    it("regional properties often have higher yields", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.regionalCity;
        const annualRent = monthlyRent * 12;

        const yield_ = calculateRentalYield(annualRent, propertyValue);

        expect(yield_).toBe(6); // (1500 * 12) / 300000 * 100 = 6%
    });

    it("rural properties can have good yields", () => {
        const { monthlyRent, propertyValue } = RENTAL_SCENARIOS.rural;
        const annualRent = monthlyRent * 12;

        const yield_ = calculateRentalYield(annualRent, propertyValue);

        expect(yield_).toBe(6); // (1000 * 12) / 200000 * 100 = 6%
    });
});
