/**
 * Downsizing scenarios for Home Mover.
 *
 * Tests trading down to smaller/cheaper property.
 */

import { describe, expect, it } from "vitest";
import { EQUITY_SCENARIOS, PROPERTY_VALUES } from "../fixtures";

describe("Home Mover downsizing scenarios", () => {
    it("downsizing releases equity", () => {
        const { currentPropertyValue, mortgageBalance } =
            EQUITY_SCENARIOS.goodEquity;
        const targetProperty = PROPERTY_VALUES.starter; // €300k

        const saleProceeds = currentPropertyValue - mortgageBalance;
        const cashAfterPurchase = saleProceeds - targetProperty;

        expect(saleProceeds).toBe(300000);
        // Can buy outright with no mortgage needed
        expect(cashAfterPurchase).toBe(0);
    });

    it("downsizing with remaining mortgage", () => {
        const { currentPropertyValue, mortgageBalance } =
            EQUITY_SCENARIOS.moderateEquity;
        const targetProperty = PROPERTY_VALUES.starter; // €300k

        const saleProceeds = currentPropertyValue - mortgageBalance;
        const additionalMortgageNeeded = Math.max(
            0,
            targetProperty - saleProceeds,
        );

        expect(saleProceeds).toBe(150000);
        expect(additionalMortgageNeeded).toBe(150000);
    });
});
