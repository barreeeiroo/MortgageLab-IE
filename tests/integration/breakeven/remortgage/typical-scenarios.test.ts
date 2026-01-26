/**
 * Typical remortgage scenarios.
 *
 * Tests common rate switching situations.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRemortgageBreakeven,
	type RemortgageInputs,
} from "@/lib/mortgage/breakeven";
import { ESTIMATED_REMORTGAGE_LEGAL_FEES } from "@/lib/utils/fees";
import { REMORTGAGE_SCENARIOS } from "../fixtures";

describe("Remortgage typical scenarios", () => {
	it("coming off fixed rate to lower variable", () => {
		const scenario = REMORTGAGE_SCENARIOS.fixedToVariable;
		const inputs: RemortgageInputs = {
			...scenario,
		};

		const result = calculateRemortgageBreakeven(inputs);

		// 0.7% rate reduction should yield meaningful savings
		expect(result.monthlySavings).toBeGreaterThan(0);
		expect(result.newMonthlyPayment).toBeLessThan(result.currentMonthlyPayment);

		// Should break even within reasonable timeframe
		expect(result.breakevenMonths).toBeLessThan(24);

		// Verify switching costs
		expect(result.legalFees).toBe(ESTIMATED_REMORTGAGE_LEGAL_FEES);
		expect(result.switchingCosts).toBe(ESTIMATED_REMORTGAGE_LEGAL_FEES);
	});

	it("switching lenders for better rate", () => {
		const scenario = REMORTGAGE_SCENARIOS.lenderSwitch;
		const inputs: RemortgageInputs = {
			...scenario,
		};

		const result = calculateRemortgageBreakeven(inputs);

		// 0.7% rate drop on €350k balance = meaningful savings
		expect(result.monthlySavings).toBeGreaterThan(100);

		// Total interest saved over remaining term
		expect(result.interestSavingsDetails.interestSaved).toBeGreaterThan(10000);

		// Net benefit after costs
		expect(result.interestSavingsDetails.netBenefit).toBeGreaterThan(8000);
	});

	it("large balance with significant rate drop", () => {
		const scenario = REMORTGAGE_SCENARIOS.largeBalanceDrop;
		const inputs: RemortgageInputs = {
			...scenario,
		};

		const result = calculateRemortgageBreakeven(inputs);

		// 1.5% drop on €450k = major savings
		expect(result.monthlySavings).toBeGreaterThan(300);

		// Should break even very quickly
		expect(result.breakevenMonths).toBeLessThan(6);

		// Massive interest savings over 25 years
		expect(result.interestSavingsDetails.interestSaved).toBeGreaterThan(50000);
	});
});
