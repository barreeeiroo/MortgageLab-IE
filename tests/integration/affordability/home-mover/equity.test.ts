/**
 * Equity calculation scenarios for Home Mover.
 *
 * Tests equity from current property serving as deposit.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRequiredDeposit,
	EQUITY_SCENARIOS,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("Home Mover equity calculations", () => {
	const MOVER_LTV = LTV_LIMITS.MOVER; // 90%

	it("calculates available equity correctly", () => {
		const { currentPropertyValue, mortgageBalance, equity } =
			EQUITY_SCENARIOS.goodEquity;

		const calculatedEquity = currentPropertyValue - mortgageBalance;

		expect(calculatedEquity).toBe(equity);
		expect(calculatedEquity).toBe(300000);
	});

	it("equity can serve as deposit for new property", () => {
		const { equity } = EQUITY_SCENARIOS.goodEquity;
		const targetProperty = PROPERTY_VALUES.dublin; // €500k

		const requiredDeposit = calculateRequiredDeposit(targetProperty, MOVER_LTV);
		const depositCovered = equity >= requiredDeposit;

		expect(requiredDeposit).toBeCloseTo(50000, 0);
		expect(depositCovered).toBe(true);
		expect(equity - requiredDeposit).toBeCloseTo(250000, 0); // Extra funds available
	});

	it("low equity may not cover required deposit", () => {
		const { equity } = EQUITY_SCENARIOS.lowEquity; // €50k
		const targetProperty = PROPERTY_VALUES.premium; // €600k

		const requiredDeposit = calculateRequiredDeposit(targetProperty, MOVER_LTV);

		expect(requiredDeposit).toBeCloseTo(60000, 0);
		expect(equity).toBeLessThan(requiredDeposit);
		// Need additional €10k from savings
	});
});
