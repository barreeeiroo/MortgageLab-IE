/**
 * Edge cases for remortgage breakeven.
 *
 * Tests boundary conditions and unusual scenarios.
 */

import { describe, expect, it } from "vitest";
import {
	calculateRemortgageBreakeven,
	type RemortgageInputs,
} from "@/lib/mortgage/breakeven";

describe("Remortgage edge cases", () => {
	it("handles same rate (no benefit)", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 300000,
			currentRate: 4.0,
			newRate: 4.0,
			remainingTermMonths: 240,
		};

		const result = calculateRemortgageBreakeven(inputs);

		expect(result.monthlySavings).toBe(0);
		expect(result.breakevenMonths).toBe(Infinity);
	});

	it("handles higher new rate (negative savings)", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 300000,
			currentRate: 3.5,
			newRate: 4.0, // Higher rate
			remainingTermMonths: 240,
		};

		const result = calculateRemortgageBreakeven(inputs);

		expect(result.monthlySavings).toBeLessThan(0);
		expect(result.breakevenMonths).toBe(Infinity);
		expect(result.interestSavingsDetails.interestSaved).toBeLessThan(0);
	});

	it("handles short remaining term", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 50000, // Small balance
			currentRate: 4.5,
			newRate: 3.5,
			remainingTermMonths: 24, // 2 years
		};

		const result = calculateRemortgageBreakeven(inputs);

		// Small balance + short term = limited savings potential
		// May not be worth the switching costs
		expect(result.yearlyBreakdown).toHaveLength(2);

		// Monthly savings exist but total is limited
		expect(result.monthlySavings).toBeGreaterThan(0);
		expect(result.totalSavingsOverTerm).toBeLessThan(2000);
	});

	it("handles very large balance", () => {
		const inputs: RemortgageInputs = {
			outstandingBalance: 800000,
			currentRate: 4.5,
			newRate: 3.5,
			remainingTermMonths: 300,
		};

		const result = calculateRemortgageBreakeven(inputs);

		// Large balance amplifies savings from 1% rate drop
		expect(result.monthlySavings).toBeGreaterThan(400);
		expect(result.interestSavingsDetails.interestSaved).toBeGreaterThan(100000);

		// Quick breakeven
		expect(result.breakevenMonths).toBeLessThan(6);
	});
});
