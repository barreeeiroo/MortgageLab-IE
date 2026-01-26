/**
 * Bridging scenarios for Home Mover.
 *
 * Tests buying before selling (bridging finance).
 */

import { describe, expect, it } from "vitest";
import {
	calculateMaxMortgageByLTV,
	EQUITY_SCENARIOS,
	LTV_LIMITS,
	PROPERTY_VALUES,
} from "../fixtures";

describe("Home Mover bridging scenarios", () => {
	const MOVER_LTV = LTV_LIMITS.MOVER; // 90%

	it("calculates costs when buying before selling", () => {
		const { mortgageBalance } = EQUITY_SCENARIOS.goodEquity;
		const targetProperty = PROPERTY_VALUES.dublin; // €500k

		// Temporary mortgage = new mortgage + old mortgage
		const newMortgageAmount = calculateMaxMortgageByLTV(
			targetProperty,
			MOVER_LTV,
		);
		const totalExposure = newMortgageAmount + mortgageBalance;

		expect(newMortgageAmount).toBe(450000);
		expect(totalExposure).toBe(600000);
		// High exposure until old property sells
	});
});
