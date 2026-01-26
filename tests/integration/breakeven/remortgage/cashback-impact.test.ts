/**
 * Cashback impact scenarios for remortgage.
 *
 * Tests how cashback affects switching decision.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRemortgageBreakeven,
	type RemortgageInputs,
} from "@/lib/mortgage/breakeven";
import { REMORTGAGE_SCENARIOS } from "../fixtures";

describe("Remortgage cashback impact", () => {
	it("cashback reduces effective switching costs", () => {
		const scenario = REMORTGAGE_SCENARIOS.fixedToVariable;

		const withoutCashback = calculateRemortgageBreakeven(scenario);
		const withCashback = calculateRemortgageBreakeven({
			...scenario,
			cashback: 1000,
		});

		// Cashback reduces switching costs
		expect(withCashback.switchingCosts).toBe(
			withoutCashback.switchingCosts - 1000,
		);

		// Faster breakeven with cashback
		expect(withCashback.breakevenMonths).toBeLessThan(
			withoutCashback.breakevenMonths,
		);
	});

	it("large cashback can eliminate switching costs", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 300000,
			currentRate: 4.0,
			newRate: 3.7,
			remainingTermMonths: 240,
			cashback: 2000, // More than legal fees
		};

		const result = calculateRemortgageBreakeven(inputs);

		// Switching costs capped at 0
		expect(result.switchingCosts).toBe(0);

		// Immediate breakeven
		expect(result.breakevenMonths).toBe(1);
	});

	it("cashback plus rate improvement is ideal scenario", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 350000,
			currentRate: 4.5,
			newRate: 3.5,
			remainingTermMonths: 300,
			cashback: 1500,
		};

		const result = calculateRemortgageBreakeven(inputs);

		// Good monthly savings from 1% rate drop
		expect(result.monthlySavings).toBeGreaterThan(150);

		// Minimal effective cost (cashback covers legal fees)
		expect(result.switchingCosts).toBe(0);

		// Excellent net benefit
		expect(result.interestSavingsDetails.netBenefit).toBeGreaterThan(40000);
	});
});
